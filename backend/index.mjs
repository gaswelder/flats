import dotenv from "dotenv";
import pg from "pg";
import createCore from "./core.mjs";
import { createApp } from "./http.mjs";
import { batcher } from "./lib/batcher.mjs";
import { pgx } from "./lib/pgx.mjs";
import { log } from "./lib/slog.mjs";
import { getMailer } from "./mailer.mjs";
import { getStamp } from "./stamp.mjs";
import { getdb, migrate } from "./storage.mjs";
import { timer } from "./timer.mjs";

dotenv.config();

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
  const core = createCore(db, storage, mailer, log, config.DATADIR);

  const cmd = process.argv[2];
  if (cmd) {
    await cli(pool, core, cmd, process.argv.slice(3));
  } else {
    await serve(pool, core, storage);
  }
};

const serve = async (pool, core, storage) => {
  await migrate(pool, log);
  const PORT = process.env.PORT || 8000;
  const app = createApp(core);
  app.listen(PORT, "localhost", () => {
    log.info("web server started on port " + PORT);
  });

  scheduleDaily(storage, "lastSnapshotDate", async () => {
    try {
      const tick = timer(log);
      const ts = await storage.saveSnapshot();
      tick("save_snapshot");
      log.info("saved the snapshot");
      const n = await storage.generateSnapshotSquares(ts);
      tick("generate_squares", n);
      log.info("generated squares");
    } catch (err) {
      log.error("snapshot failed: " + err.message, { err });
    }
  });
};

const scheduleDaily = (storage, key, f) => {
  setInterval(async () => {
    const now = getStamp("daily");
    const last = await storage.getValue(key);
    if (now == last) {
      return;
    }
    await f();
    await storage.setValue(key, now);
  }, 1000 * 3600);
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
    if (v.length == 1) continue;
    v.sort((a, b) => b.getTime() - a.getTime());
    console.log(k, v);
    await del.add(...v.slice(1, v.length));
  }
  await del.end();
};

const cli = async (pool, srv, cmd, args) => {
  const storage = getdb(pool);
  switch (cmd) {
    case "setup":
      await migrate(pool, log);
      break;
    case "prune-snapshots":
      await pruneSnapshots(storage);
      break;
    case "create-squares":
      for await (const s of storage.getSnapshots()) {
        const n = await storage.generateSnapshotSquares(s.ts);
        if (n != "exists") {
          console.log(s.ts, n);
        }
      }
      break;
    case "add-admin": {
      const [name, password] = args;
      await srv.addUser(name, password, true);
      break;
    }
    default:
      process.stderr.write(`Unknown command: ${cmd}\n`);
      process.exit(1);
  }
  pool.end();
};

main();
