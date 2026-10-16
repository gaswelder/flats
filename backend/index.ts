import type { Pool } from "pg";
import pg from "pg";
import { createCore } from "./core.ts";
import { createApp } from "./http.ts";
import { batcher } from "./lib/batcher.ts";
import { pgx } from "./lib/pgx.ts";
import { log } from "./lib/slog.ts";
import { getMailer } from "./mailer.ts";
import { getStamp } from "./stamp.ts";
import { getdb, migrate } from "./storage.ts";
import { timer } from "./timer.ts";

const main = async () => {
  const config = {
    DATABASE_URL: "postgres:postgres@localhost:5432",
    ADMIN_EMAIL: "",
    DATADIR: ".",
    NOTIFIER: "",
    NOTIFIER_FROM: "flats",
  };
  for (const k in config) {
    if (k in process.env) {
      (config as any)[k] = process.env[k]!;
    }
  }
  const cmd = process.argv[2];
  const args = process.argv.slice(2);

  if (config.ADMIN_EMAIL === "") {
    log.warn("ADMIN_EMAIL is not set, maintenance notifications are disabled");
  }
  const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
  const mailer = getMailer(config.NOTIFIER, config.NOTIFIER_FROM);
  const db = pgx(pool);
  const storage = getdb(pool);
  const core = createCore(db, storage, mailer, log, config.DATADIR);
  try {
    switch (cmd) {
      case "serve": {
        await serve(pool, core, storage);
        break;
      }
      case "setup": {
        const u = new URL(config.DATABASE_URL);
        const dbname = u.pathname.replace("/", "");
        u.pathname = "";
        const root = new pg.Pool({ connectionString: u.toString() });
        try {
          await root.query("create database " + dbname + ";");
        } catch (err: any) {
          process.stderr.write("create database failed: " + err.message + "\n");
        }
        root.end();
        await migrate(pool, log);
        break;
      }

      case "add-admin": {
        const [name, password] = args;
        await core.addUser(name, password, true);
        break;
      }

      //
      // For each date, keep only the latest snapshot and delete others.
      //
      case "prune-snapshots": {
        const tss = await storage.getSnapshotTimes();
        const buckets = (Object as any).groupBy(tss, (ts: Date) =>
          ts.toISOString().substring(0, 10),
        ) as Record<string, Date[]>;
        const del = batcher(100, (items: any[]) =>
          storage.deleteSnapshots(items),
        );
        for (const [k, v] of Object.entries(buckets)) {
          if (v.length === 1) continue;
          v.sort((a: Date, b: Date) => b.getTime() - a.getTime());
          console.log(k, v);
          await del.add(...v);
        }
        await del.end();
        break;
      }
      case "create-squares":
        for await (const s of storage.getSnapshots()) {
          const n = await storage.generateSnapshotSquares(s.ts);
          if (n != "exists") {
            console.log(s.ts, n);
          }
        }
        break;

      default:
        process.stderr.write(`Unknown command: ${cmd}\n`);
        process.exit(1);
    }
  } catch (err: any) {
    process.stderr.write(err.message + "\n");
    process.exit(1);
  }
  pool.end();
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

const scheduleDaily = (storage: any, key: string, f: () => Promise<void>) => {
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

main();
