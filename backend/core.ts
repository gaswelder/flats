import bcrypt from "bcrypt";
import fs from "fs";
import * as t from "runtypes";
import { notifySubscribers } from "./notifier.ts";
import { Offer } from "./offer.ts";
import { getStamp } from "./stamp.ts";
import { timer } from "./timer.ts";
import type { PgDB } from "./lib/pgx.ts";
import type { Storage } from "./storage.ts";
import type { Mailer } from "./mailer.ts";

type Logger = {
  info: (msg: string, data?: any) => void;
  warn: (msg: string, data?: any) => void;
  error: (msg: string, data?: any) => void;
};

export default (
  db: PgDB,
  storage: Storage,
  mailer: Mailer,
  log: Logger,
  datadir: string
) => {
  return {
    /**
     * Updates a named snapshot.
     *
     * A worker collects a complete snapshot for its area and posts it here.
     * Here the snapshot is merged into the current offers table using diffs.
     *
     * @param name
     * @param items
     * @param time ISO time string for the snapshot's date
     */
    async addSnapshot(name: string, items: any[], time: string) {
      log.info("got a snapshot", {
        name,
        count: items.length,
        snapshot_time: time,
      });

      const tick = timer(log);

      // Parse the offers data.
      const newOffers: Offer[] = [];
      const ids = new Set<string>();
      for (const item of items) {
        const x = Offer.parseFromWorker(item);
        if (!ids.has(x.id)) {
          ids.add(x.id);
          newOffers.push(x);
        }
      }
      tick("parse_offers", newOffers.length);

      await storage.addSnapshotLog(name, newOffers.length);

      const counts = await storage.mergeSnapshot(tick, newOffers, name, time);
      const { same, updated, removed, added } = counts;
      log.info(
        `got ${newOffers.length}: =${same.length} ~${updated.length} +${added.length} -${removed.length}`,
        { name }
      );
      tick("merge_snapshot");

      // Notify subscribers in background.
      storage
        .getSubscribers()
        .then((subscribers) =>
          notifySubscribers(subscribers, added, mailer, time)
        )
        .catch((err) => {
          log.error(`notification failed: ${err.message}`, { err });
        });

      // Store the data for archival.
      {
        const path = getStamp("monthly") + ".jsonl";
        const data =
          newOffers
            .map((x) => JSON.stringify({ ts: time, provider: name, ...x }))
            .join("\n") + "\n";
        fs.appendFileSync(datadir + "/" + path, data);
      }
    },

    /**
     * Returns a list of current offers that fit the given filter.
     *
     * @param filter
     * @param limit
     */
    async getOffers(filter0: any, limit: number) {
      if (limit === undefined) {
        throw new Error(`missing the limit argument`);
      }
      const filter = t
        .Record({
          rooms: t.Array(t.Number),
          maxPrice: t.Number,
          lat: t.Array(t.Number),
          lon: t.Array(t.Number),
        })
        .check(filter0) as any;

      const { rows } = await db.q`
      select id, price, rooms, url, lat, lon, address from current_offers
      where price <= ${filter.maxPrice}
        and price > 0
        and rooms in (${db.inject(filter.rooms.join(","))})
        and lat between ${filter.lat[0]} and ${filter.lat[1]}
        and lon between ${filter.lon[0]} and ${filter.lon[1]}
      limit ${db.inject(limit)}`;

      return rows.map((row: any) => {
        // Frontend shape
        return {
          ...row,
          coords: [row.lat, row.lon],
        };
      });
    },

    /**
     * Returns a series of historical counts and prices for given area.
     *
     * @param filter
     * @returns {{ts: Date, count: number}[]}
     */
    async getHistory(filter: any) {
      const h = await storage.getHistory(filter);
      return h;
    },

    /**
     * Adds a subscription to new offers in the selected area.
     */
    addSubscriber(s: any) {
      const obj = t
        .Record({
          email: t.String,
          lat: t.Number,
          lon: t.Number,
          maxPrice: t.Number,
          maxRadius: t.Number,
        })
        .check(s) as any;
      return storage.addSubscriber(obj);
    },

    storage() {
      return storage;
    },

    async getUpdates() {
      return storage.getSnapshotLogs();
    },

    async addUser(name: string, password: string, isAdmin = false) {
      const phash = await bcrypt.hash(password, 10);
      await db.batchInsert("users", [
        { name, phash, is_admin: Boolean(isAdmin) },
      ]);
    },

    async checkAdminToken(token: string) {
      const r = await db.q`select * from users where token=${token}`;
      if (r.rows.length !== 1) return false;
      return r.rows[0].is_admin;
    },

    async adminLogin(name: string, password: string): Promise<string | null> {
      const r = await this.login(name, password);
      if (!r.ok || !r.isAdmin) return null;
      return r.token ?? null;
    },

    async login(name: string, password: string) {
      const res = await db.q`select * from users where name=${name}`;
      if (res.rows.length !== 1) {
        return { ok: false };
      }
      const r = res.rows[0];
      const ok = await bcrypt.compare(password, r.phash);
      if (!ok) {
        return { ok };
      }
      const token = await bcrypt.genSalt(1);
      await db.q`update users set token = ${token} where id=${r.id}`;
      return { ok, token, isAdmin: r.is_admin };
    },
  };
};
