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
  const {
    rows,
  } = await t.query(
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
      const [
        rmin,
        rmax,
      ] = await db.q`select min(ts), max(ts) from price_snapshots`.then((r) => [
        r.rows[0].min,
        r.rows[0].max,
      ]);
      const min = new Date(
        rmin.toISOString().substring(0, "2023-08-17".length) + "T00:00:00.000Z"
      );
      min.setTime(min.getTime() + 1000 * 3600 * 24);
      const max = new Date(
        rmax.toISOString().substring(0, "2023-08-17".length) + "T00:00:00.000Z"
      );
      max.setTime(max.getTime() + 1000 * 3600 * 24);
      const r = await db.q`
        with dates as (select generate_series(
          timestamp without time zone '${db.inject(min.toISOString())}',
          timestamp without time zone '${db.inject(max.toISOString())}',
          '1 day'
        ) as d),
        cuts as (
            select dates.d, (select max(ts) from price_snapshots where ts <= dates.d) as ts
            from dates
        )
        select cuts.ts, avg(price) as price, count(*)
        from cuts
        join price_snapshots using (ts)
        join offers on offers.id = price_snapshots.id
        where price > 0
            and price < ${filter.maxPrice}
            and offers.rooms in (${db.inject(filter.rooms.join(","))})
            and offers.lat between ${filter.lat[0]} and ${filter.lat[1]}
            and offers.lon between ${filter.lon[0]} and ${filter.lon[1]}
        group by 1`;
      return r.rows;
    },

    async getSnapshotLogs() {
      const r = await db.q`select * from logs order by t desc limit 20`;
      return r.rows;
    },
    async addSnapshotLog(name, count) {
      await db.batchInsert("logs", [{ t: new Date(), count, name }]);
    },

    async getSnapshotTimes() {
      const r = await db.q`select distinct ts from snapshots`;
      return r.rows.map((x) => x.ts);
    },

    async deleteSnapshots(tss) {
      await db.query(`delete from snapshots where ts = any($1)`, [tss]);
    },
  };
};
