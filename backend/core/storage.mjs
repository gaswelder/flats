import { diff } from "../lib/diff.mjs";
import { pgx } from "../lib/pgx.mjs";
import { Offer } from "./offer.mjs";

const init = [
  // "meta" is a key-value table for internal purposes. For example, last
  // migration number is stored there.
  `create table meta ( ts timestamp, k varchar(20), v varchar(100) );`,

  // current_offers is the current state of all latest observed offers from all
  // workers. It is patched when changes are uploaded.
  `create table current_offers (
    snapshot_name varchar(40),
    ts timestamptz,
    id varchar(100),
    lat float,
    lon float,
    price float,
    original_price varchar(1000),
    rooms int,
    url varchar(2000),
    coords point,
    address varchar(400)
  );`,

  // subscribers keeps email addresses and their corresponding filters for
  // "interesting" offers.
  // A single email can appear multiple times with different filters.
  `create table subscribers (
    id serial,
    email varchar(100),
    lat float,
    lon float,
    max_price int,
    max_radius int
  );`,

  // offers is a normalized list of all offers without their prices.
  // The offers are static, and the changing prices are kept in another table.
  `create table offers (
    id varchar(100),
    url varchar(1000),
    rooms int,
    lat float,
    lon float,
    address varchar(400)
  );
  create unique index on offers (id);
  `,

  // the price_snapshots table stores all prices for all offers for every
  // date. This table is needed for historical statistical queries.
  //
  // currently it's not every date but every timestamp when there is any change
  // in the offers or prices.
  `create table snapshots (
    ts timestamptz,
    id varchar(100),
    price float,
    original_price varchar(1000)
  );
  create index snapshots_price_rooms_lat_lon_ts_idx on snapshots (price, ts);`,

  // ---------------

  // users
  `create table users (
    id serial,
    name varchar(20) unique,
    phash varchar(100),
    token varchar(60));`,

  // The logs table records upload events.
  `create table logs (t timestamptz, message text);`,

  `create table suggested_offers (
    subscriber_id int not null,
    offer_id varchar(100) not null,
    unique (subscriber_id, offer_id)
    );`,
].join("\n");

const patches = [
  {
    v: 16,
    f: async (conn) => {
      await conn.q`insert into users (name, phash) values ('foo', '$2b$10$q2PL7T3n7w4POyw9rL4nfOlNqHWqpKJJ0yRe.gtWUDjz4ZGWZFevu')`;
    },
  },
  {
    v: 17,
    f: async (conn) => {
      await conn.q`alter table suggested_offers add column archived bool default false`;
    },
  },
  {
    v: 18,
    async f(conn) {
      await conn.q`alter table logs add name text, add count int`;
    },
  },
  {
    v: 19,
    async f(conn) {
      await conn.q`alter table snapshots rename to price_snapshots`;
    },
  },
  {
    v: 20,
    async f(conn) {
      await conn.q`create table history_squares (ts timestamptz, x int, y int, sum int, count int);
        create index on history_squares(ts, x, y);
      `;
    },
  },
  {
    v: 21,
    async f(conn) {
      await conn.q`drop table suggested_offers`;
    },
  },
];

export const migrate = async (pool0, logger) => {
  const db = pgx(pool0);
  const r = await db.q`SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE  table_schema = 'public'
    AND    table_name   = 'meta'
    )`;
  if (!r.rows[0].exists) {
    logger.info(`initializing the database`);
    await db.query(init);
  }
  const version = await getVersion(db);
  for (const m of patches) {
    if (m.v <= version) {
      continue;
    }
    logger.info("running migration " + m.v);
    await db.transaction(async (conn) => {
      await m.f(conn, logger);
      await setVersion(conn, m.v);
    });
    logger.info("migration " + m.v + " done");
  }
};

const getValue = async (t, name) => {
  const { rows } = await t.query(
    `select v from meta where k = $1 order by ts desc limit 1`,
    [name]
  );
  if (rows.length === 0) {
    return undefined;
  }
  return JSON.parse(rows[0].v);
};

const setValue = async (t, name, v) => {
  await t.query("insert into meta (ts, k, v) values (now(), $1, $2)", [
    name,
    JSON.stringify(v),
  ]);
};

const getVersion = async (t) => {
  const v = await getValue(t, "version");
  return v || 0;
};

const setVersion = async (t, v) => {
  await setValue(t, "version", v);
};

const squareCoords = (lat, lon) => {
  // 1 deg lat ~ 100 km
  const x = Math.floor((lon + 90) * 100);
  const y = Math.floor((lat + 180) * 100);
  return [x, y];
};

export const getdb = (pool) => {
  const db = pgx(pool);
  return {
    getValue(name) {
      return getValue(db, name);
    },
    setValue(name, value) {
      return setValue(db, name, value);
    },

    getSubscribers() {
      return pool.query(`select * from subscribers`).then((r) => r.rows);
    },

    async getSubscriberByEmail(email) {
      const r = await db.q`select * from subscribers where email=${email}`;
      return r.rows[0];
    },

    async addSubscriber(s) {
      await db.batchInsert("subscribers", [
        {
          email: s.email,
          lat: s.lat,
          lon: s.lon,
          max_price: s.max_price,
          max_radius: s.max_radius,
        },
      ]);
    },

    async saveSnapshot() {
      const time = new Date();
      await db.q`insert into price_snapshots (ts, id, price, original_price)
        select ${time}, b.id, b.price, b.original_price from current_offers b`;
      return time;
    },

    mergeSnapshot(tick, newOffers, name, time) {
      return db.transaction(async (tr) => {
        // Compare with the last snapshot from this worker.
        const r1 =
          await tr.q`select * from current_offers where snapshot_name = ${name}`;
        const oldOffers = r1.rows.map(Offer.parseFromDB);
        tick("get_current_offers");

        const d = diff(oldOffers, newOffers, (x) => x.id);
        const added = d.onlyRight;
        const removed = d.onlyLeft;
        const same = d.both
          .filter((pair) => pair.left.eq(pair.right))
          .map((pair) => pair.right);
        const updated = d.both
          .filter((pair) => !pair.left.eq(pair.right))
          .map((pair) => pair.right);

        tick("diff");

        //
        // Apply the diff
        //
        if (removed.length > 0) {
          const ids = removed.map((x) => x.id);
          await tr.query(
            `delete from current_offers where snapshot_name = $1 and id = any($2)`,
            [name, ids]
          );
        }
        tick("remove");
        if (added.length > 0) {
          const r1 = await tr.q`select id from offers`;
          const knownOffers = new Set(r1.rows.map((x) => x.id));
          await tr.batchInsert(
            "offers",
            added
              .filter((offer) => !knownOffers.has(offer.id))
              .map((offer) => {
                return {
                  id: offer.id,
                  url: offer.url,
                  rooms: offer.rooms,
                  address: offer.address,
                  lat: offer.lat,
                  lon: offer.lon,
                };
              })
          );
          await tr.batchInsert(
            "current_offers",
            added.map((offer) => {
              return {
                snapshot_name: name,
                ts: time,
                id: offer.id,
                price: offer.price,
                original_price: offer.originalPrice,
                rooms: offer.rooms,
                address: offer.address,
                url: offer.url,
                lat: offer.lat,
                lon: offer.lon,
              };
            })
          );
        }
        tick("add");
        if (updated.length > 0) {
          for (const offer of updated) {
            await tr.query(
              `update current_offers
                  set ts = $1, price = $2, rooms = $3, address = $4, url = $5,
                    lat = $6, lon = $7, original_price = $8
                  where snapshot_name = $9 and id = $10`,
              [
                time,
                offer.price,
                offer.rooms,
                offer.address,
                offer.url,
                offer.lat,
                offer.lon,
                offer.originalPrice,
                name,
                offer.id,
              ]
            );
          }
        }
        tick("update");
        return { added, same, updated, removed };
      });
    },

    async getHistory(filter) {
      const [x1, y1] = squareCoords(filter.lat[0], filter.lon[0]);
      const [x2, y2] = squareCoords(filter.lat[1], filter.lon[1]);

      const r = await db.q`select * from history_squares
      where x between ${x1} and ${x2}
        and y between ${y1} and ${y2}`;

      const gg = Object.groupBy(r.rows, (x) => x.ts);
      return Object.entries(gg)
        .map(([ts, v]) => {
          let count = 0;
          let sum = 0;
          v.forEach((row) => {
            count += row.count;
            sum += row.sum;
          });
          return {
            ts: v[0].ts,
            price: sum / count,
            count,
          };
        })
        .sort((a, b) => a.ts.getTime() - b.ts.getTime());
    },

    async getSnapshotLogs() {
      const r = await db.q`select * from logs order by t desc limit 20`;
      return r.rows;
    },
    async addSnapshotLog(name, count) {
      await db.batchInsert("logs", [{ t: new Date(), count, name }]);
    },

    async getSnapshotTimes() {
      const r = await db.q`select distinct ts from price_snapshots`;
      return r.rows.map((x) => x.ts);
    },

    async *getSnapshots() {
      let cursor = new Date("2000-01-01");
      for (;;) {
        let r =
          await db.q`select distinct ts from price_snapshots where ts > ${cursor} order by ts limit 1000`;
        if (r.rows.length == 0) break;
        const tss = r.rows.map((row) => row.ts);
        for (const ts of tss) {
          yield { ts };
          cursor = ts;
        }
      }
    },

    async generateSnapshotSquares(ts) {
      // Skip if the squares already exist for this snapshot.
      let r =
        await db.q`select * from history_squares where ts = ${ts} limit 1`;
      if (r.rows.length > 0) {
        return "exists";
      }

      r = await db.q`select * from price_snapshots join offers using (id)
          where ts = ${ts}`;
      const offers = r.rows;

      const squares = {};
      for (const o of offers) {
        const [x, y] = squareCoords(o.lat, o.lon);
        const key = [x, y].join(",");
        if (!squares[key]) {
          squares[key] = { ts, x, y, sum: 0, count: 0 };
        }
        const s = squares[key];
        s.sum += o.price;
        s.count += 1;
      }
      await db.transaction(async (conn) => {
        await conn.batchInsert("history_squares", Object.values(squares));
      });
      return Object.keys(squares).length;
    },

    async deleteSnapshots(tss) {
      await db.query(`delete from price_snapshots where ts = any($1)`, [tss]);
    },
  };
};
