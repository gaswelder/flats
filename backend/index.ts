import dotenv from "dotenv";
import { Pool } from "pg";
import createCore from "./core.ts";
import { createApp } from "./http.ts";
import { batcher } from "./lib/batcher.ts";
import { pgx } from "./lib/pgx.ts";
import { log } from "./lib/slog.ts";
import { getMailer } from "./mailer.ts";
import { getStamp } from "./stamp.ts";
import { getdb, migrate } from "./storage.ts";
import { timer } from "./timer.ts";

dotenv.config();

const main = async () => {
  const config: Record<string, string> = {
    DATABASE_URL: "postgres:postgres@localhost:5432",
    ADMIN_EMAIL: "",
    DATADIR: ".",
    NOTIFIER: "",
    NOTIFIER_FROM: "",
  };
  for (const k in config) {
    if (k in process.env) {
      config[k] = process.env[k]!;
    }
  }

  if (config.ADMIN_EMAIL === "") {
    log.warn("ADMIN_EMAIL is not set, maintenance notifications are disabled");
  }

  const pool = new Pool({ connectionString: config.DATABASE_URL });
  pool.on("error", (err: Error) => {
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

const serve = async (pool: Pool, core: any, storage: any) => {
  await migrate(pool, log);
  const PORT = Number(process.env.PORT || 8000);
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
    } catch (err: any) {
      log.error("snapshot failed: " + err.message, { err });
    }
  });
};

const scheduleDaily = (
  storage: any,
  key: string,
  f: () => Promise<void>
) => {
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

const pruneSnapshots = async (storage: any) => {
  // For each date, keep only the latest snapshot and delete others.
  // Don't need hour presision in snapshots.
  const tss = await storage.getSnapshotTimes();
  const buckets = (Object as any).groupBy(tss, (ts: Date) =>
    ts.toISOString().substring(0, 10)
  ) as Record<string, Date[]>;
  const del = batcher(100, (items: any[]) => storage.deleteSnapshots(items));
  for (const [k, v] of Object.entries(buckets)) {
    if (v.length === 1) continue;
    v.sort((a: Date, b: Date) => b.getTime() - a.getTime());
    console.log(k, v);
    await del.add(...v);
  }
  await del.end();
};

const cli = async (
  pool: Pool,
  srv: any,
  cmd: string,
  args: string[]
) => {
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
