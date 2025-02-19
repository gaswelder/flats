import bcrypt from "bcrypt";
import fs from "fs";
import t from "runtypes";
import { timer } from "../timer.mjs";
import { notifySubscribers } from "./notifier.mjs";
import { Offer } from "./offer.mjs";

export default (db, storage, mailer, log, datadir) => {
  return {
    /**
     * Updates a named snapshot.
     *
     * Each worker is responsible for one or more of the snapshots.
     * The worker collects a complete snapshot for its area and posts it here.
     * Here it's added to the current global offers table, with diffs and
     * stats calculated.
     *
     * @param {string} name
     * @param {Offer[]} items
     * @param {string} time ISO time string for the snapshot's date
     */
    async addSnapshot(name, items, time) {
      log.info("got a snapshot", {
        name,
        count: items.length,
        snapshot_time: time,
      });

      const tick = timer(log);

      // Parse the offers data.
      const newOffers = [];
      const ids = new Set();
      for (const item of items) {
        const x = Offer.parseFromWorker(item);
        if (!ids.has(x.id)) {
          ids.add(x.id);
          newOffers.push(x);
        }
      }
      tick("parse_offers");

      await storage.addSnapshotLog(name, newOffers.length);

      const { same, updated, removed, added } = await storage.mergeSnapshot(
        tick,
        newOffers,
        name,
        time
      );
      log.info(
        `got ${newOffers.length}: =${same.length} ~${updated.length} +${added.length} -${removed.length}`,
        { name }
      );
      tick("merge_snapshot");

      // Notify subscribers in background.
      storage
        .getSubscribers()
        .then((subscribers) =>
          notifySubscribers(subscribers, added, mailer, time, db)
        )
        .catch((err) => {
          log.error(`notification failed: ${err.message}`, { err });
        });
    },

    /**
     * Returns a list of current offers that fit the given filter.
     *
     * @param {Filter} filter
     * @param {number} limit
     */
    async getOffers(filter0, limit) {
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
        .check(filter0);

      const { rows } = await db.q`
      select id, price, rooms, url, lat, lon, address from current_offers
      where price <= ${filter.maxPrice}
        and price > 0
        and rooms in (${db.inject(filter.rooms.join(","))})
        and lat between ${filter.lat[0]} and ${filter.lat[1]}
        and lon between ${filter.lon[0]} and ${filter.lon[1]}
      limit ${db.inject(limit)}`;

      return rows.map((row) => {
        // Frontend shape
        return {
          ...row,
          coords: [row.lat, row.lon],
        };
      });
    },

    /**
     * Returns a series of counts for a month range for offers that match the
     * filter.
     *
     * @param {Filter} filter
     * @returns {{ts: Date, count: number}[]}
     */
    async getCounts(filter) {
      const h = await storage.getHistory(filter);
      return h.map((x) => {
        return { ts: x.ts, count: x.count };
      });
    },

    async getAverages(filter) {
      const h = await storage.getHistory(filter);
      return h.map((x) => {
        return { ts: x.ts, price: x.price };
      });
    },

    /**
     * Adds a subscription to new offers in the selected area.
     */
    addSubscriber(s) {
      const obj = t
        .Record({
          email: t.String,
          lat: t.Number,
          lon: t.Number,
          max_price: t.Number,
          max_radius: t.Number,
        })
        .check(s);
      return storage.addSubscriber(obj);
    },

    getSubscribers() {
      return storage.getSubscribers();
    },

    async getUpdates() {
      return storage.getSnapshotLogs();
    },

    async dump() {
      return db.transaction(async (tr) => {
        let r = await tr.query(
          `select distinct ts from snapshots where ts < now() - interval '1 year' order by ts`
        );
        const times = r.rows.map((x) => x.ts);
        log.info(`dump: got ${times.length} timestamps`);

        let n = 0;
        const stats = { snapshots: times.length, rows: 0 };

        let _fd;
        let _fdname;
        const getFile = (ts) => {
          const y = ts.getFullYear();
          const m = (ts.getMonth() + 1).toString().padStart(2, "0");
          const name = `${datadir}/dump-snapshots-${y}-${m}.jsonl`;
          if (!_fd) {
            _fd = fs.openSync(name, "a+");
            _fdname = name;
            return _fd;
          }
          if (name != _fdname) {
            fs.closeSync(_fd);
            _fd = fs.openSync(name, "a+");
            _fdname = name;
          }
          return _fd;
        };

        for (const ts of times) {
          const fd = getFile(ts);
          const offers = await tr.q`select * from snapshots where ts=${ts}`;
          for (const row of offers.rows) {
            fs.writeSync(fd, JSON.stringify(row) + "\n");
          }
          const r = await tr.query(`delete from snapshots where ts = $1`, [ts]);
          stats.rows += r.rowCount;
          log.info(
            `dump: ${++n} of ${times.length}, ${_fdname}, ${r.rowCount} rows`
          );
        }
        if (_fd) fs.closeSync(_fd);
        return stats;
      });
    },

    async addUser(name, password) {
      const phash = await bcrypt.hash(password, 10);
      await db.batchInsert("users", [{ name, phash }]);
    },

    async login(name, password) {
      const r = await db.q`select * from users where name=${name}`;
      if (r.rows.length != 1) {
        return { ok: false };
      }
      const ok = await bcrypt.compare(password, r.rows[0].phash);
      if (!ok) {
        return { ok };
      }
      const token = await bcrypt.genSalt(1);
      await db.q`update users set token = ${token} where id=${r.id}`;
      return { ok, token };
    },
  };
};
