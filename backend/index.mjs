import dotenv from "dotenv";
import pg from "pg";
import service from "./core/index.mjs";
import mailjet from "node-mailjet";
import { log } from "./lib/slog.mjs";
import { createApp } from "./http.mjs";
import { getdb, migrate } from "./core/storage.mjs";
import { pgx } from "./lib/pgx.mjs";

dotenv.config();

const getMailer = (spec, emailFrom) => {
  if (!emailFrom) {
    throw new Error("emailFrom is missing");
  }
  const i = spec.indexOf(":");
  const type = spec.substring(0, i);
  if (type != "mailjet") {
    throw new Error(`expected mailjet env var in NOTIFIER`);
  }
  const params = spec.substring(i + 1, spec.length);
  const [key, secret] = params.split(":");
  const mailClient = mailjet.connect(key, secret);
  return {
    send(email, subject, text) {
      const request = mailClient.post("send", { version: "v3.1" }).request({
        Messages: [
          {
            From: { Email: emailFrom, Name: "pi" },
            To: [{ Email: email, Name: "" }],
            Subject: subject,
            TextPart: text,
          },
        ],
      });
      return request;
    },
  };
};

const main = async () => {
  const config = {
    DATABASE_URL: "postgres:postgres@localhost:5432",
    ADMIN_EMAIL: "",
    DATADIR: ".",
    NOTIFIER: "",
    NOTIFIER_FROM: "",
  };
  for (const k in config) {
    if (k in process.env) {
      config[k] = process.env[k];
    }
  }

  if (config.ADMIN_EMAIL == "") {
    log.warn("ADMIN_EMAIL is not set, maintenance notifications are disabled");
  }

  const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
  pool.on("error", (err) => {
    log.error(`postgres pool error: ${err.message}`);
  });

  const mailer = getMailer(config.NOTIFIER, config.NOTIFIER_FROM);
  const db = pgx(pool);
  const storage = getdb(pool);
  const srv = service(db, storage, mailer, log, config.DATADIR);

  const cmd = process.argv[2];
  if (cmd) {
    await cli(pool, srv, cmd);
  } else {
    await serve(pool, srv, storage, mailer, config.ADMIN_EMAIL);
  }
};

const serve = async (pool, srv, storage, mailer, adminEmail) => {
  await migrate(pool, log);
  const PORT = process.env.PORT || 8000;
  const app = createApp(srv);
  app.listen(PORT, "localhost", () => {
    log.info("web server started on port " + PORT);
  });

  setInterval(async () => {
    const ts = new Date();
    const y = ts.getFullYear();
    const m = (ts.getMonth() + 1).toString().padStart(2, "0");
    const currentMonth = `${y}-${m}`;

    const dumpMonth = await storage.getValue("lastDumpMonth");
    if (currentMonth == dumpMonth) {
      return;
    }
    const stats = await srv.dump();
    await storage.setValue("lastDumpMonth", currentMonth);

    // notify
    if (adminEmail) {
      mailer.send(
        adminEmail,
        "Monthly dump is ready",
        Object.entries(stats)
          .map((e) => `${e[0]} = ${e[1]}\n`)
          .join("")
      );
    }
  }, 1000 * 3600 * 12);
};

const pruneSnapshots = async (storage) => {
  // For each date, keep only the latest snapshot and delete others.
  // Don't need hour presision in snapshots.
  const tss = await storage.getSnapshotTimes();
  const buckets = Object.groupBy(tss, (ts) =>
    ts.toISOString().substring(0, 10)
  );
  const del = batcher(100, storage.deleteSnapshots);
  for (const [k, v] of Object.entries(buckets)) {
    console.log(k, v);
    if (v.length == 1) continue;
    v.sort((a, b) => b.getTime() - a.getTime());
    await del.add(...v.slice(1, v.length));
  }
  await del.end();
};

const cli = async (pool, srv, cmd) => {
  switch (cmd) {
    case "setup":
      await migrate(pool, log);
      break;
    case "tmp":
      const storage = getdb(pool);
      await pruneSnapshots(storage);
      pool.end();
      break;
    case "dump":
      await srv.dump();
      pool.end();
      break;
    default:
      process.stderr.write(`Unknown command: ${cmd}\n`);
      process.exit(1);
  }
};

main();
