import bcrypt from "bcrypt";
import fs from "fs";
import t from "runtypes";
import { notifySubscribers } from "./notifier.mjs";
import { Offer } from "./offer.mjs";
import { getStamp } from "./stamp.mjs";
import { timer } from "./timer.mjs";

export default (db, storage, mailer, log, datadir) => {
  return {
    /**
     * Updates a named snapshot.
     *
     * A worker collects a complete snapshot for its area and posts it here.
     * Here the snapshot is merged into the current offers table using diffs.
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
          notifySubscribers(subscribers, added, mailer, time, db)
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
     * Returns a series of historical counts and prices for given area.
     *
     * @param {Filter} filter
     * @returns {{ts: Date, count: number}[]}
     */
    async getHistory(filter) {
      const h = await storage.getHistory(filter);
      return h;
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
          maxPrice: t.Number,
          maxRadius: t.Number,
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
