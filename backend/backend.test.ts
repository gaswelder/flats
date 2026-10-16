import * as assert from "assert";
import { test } from "node:test";
import pg from "pg";
import * as timers from "timers/promises";
import { createCore } from "./core.ts";
import { pgx } from "./lib/pgx.ts";
import { getdb, migrate } from "./storage.ts";

const withFakeDate = async (d: Date, f: () => Promise<void>) => {
  const original = (global as any).Date;
  (global as any).Date = class extends Date {
    constructor() {
      super(d);
    }
  };
  try {
    await f();
  } finally {
    (global as any).Date = original;
  }
};

const allocDb = async () => {
  const name = "flats_test_" + Date.now();
  const root1 = new pg.Pool({
    connectionString: "psql://postgres:postgres@localhost:5432/postgres",
  });
  await root1.query("create database " + name);
  root1.end();
  const pool = new pg.Pool({
    connectionString: "psql://postgres:postgres@localhost:5432/" + name,
  });
  return {
    pool,
    async close() {
      pool.end();
      const root2 = new pg.Pool({
        connectionString: "psql://postgres:postgres@localhost:5432/postgres",
      });
      await root2.query("drop database " + name);
      root2.end();
    },
  };
};

const setup = async () => {
  const DB = await allocDb();
  const logger = {
    ...console,
    info: () => {},
    warn: () => {},
    error: () => {},
  };
  await migrate(DB.pool, logger);
  const mailboxes = new Map<string, any[]>();
  const mailer = {
    send(email: string, subject: string, body: string) {
      const mb = mailboxes.get(email);
      if (mb) {
        mb.push({ subject, body });
      } else {
        mailboxes.set(email, [{ subject, body }]);
      }
    },
  };

  const db = pgx(DB.pool);
  const storage = getdb(DB.pool);
  const s = createCore(db, storage, mailer, logger, ".");
  return {
    db: DB.pool,
    service: s,
    popMail: (email: string) => {
      const b = mailboxes.get(email);
      if (!b) {
        return [];
      }
      const mails = [...b];
      b.length = 0;
      return mails;
    },
    async [Symbol.asyncDispose]() {
      await DB.close();
    },
  };
};

const defFilter = {
  rooms: [1, 2, 3],
  maxPrice: 9000,
  lat: [-180, 180],
  lon: [-180, 180],
};

test("test run 1", async () => {
  await using t = await setup();
  const s = t.service;
  await t.service.addSnapshot(
    "city1",
    [
      {
        id: "1",
        price: 300,
        originalPrice: "300 dollars",
        lat: 27.0,
        lon: 34.0,
        rooms: 1,
        address: "street name, 12",
        url: "https://www.example.com/1",
      },
      {
        id: "2",
        price: 400,
        originalPrice: "400 dollars",
        lat: 28.0,
        lon: 40.0,
        rooms: 1,
        address: "street name, 24",
        url: "https://www.example.com/2",
      },
    ],
    new Date().toISOString(),
  );

  const all = await s.getOffers(defFilter, 10);
  assert.deepEqual(new Set(all.map((x: any) => x.id)), new Set([1, 2]));

  const cheap = await s.getOffers({ ...defFilter, maxPrice: 300 }, 10);
  assert.deepEqual(new Set(cheap.map((x: any) => x.id)), new Set([1]));

  const nearby = await s.getOffers(
    {
      ...defFilter,
      lat: [25, 29],
      lon: [39, 41],
    },
    10,
  );
  assert.deepEqual(new Set(nearby.map((x: any) => x.id)), new Set([2]));
});

test("doesn't crash on duplicates in a snapshot", async () => {
  await using t = await setup();
  await t.service.addSnapshot(
    "city1",
    [
      {
        id: "1",
        price: 300,
        originalPrice: "300 dollars",
        lat: 27.0,
        lon: 34.0,
        rooms: 1,
        address: "street name, 12",
        url: "https://www.example.com/1",
      },
      {
        id: "1",
        price: 300,
        originalPrice: "300 dollars",
        lat: 27.0,
        lon: 34.0,
        rooms: 1,
        address: "street name, 12",
        url: "https://www.example.com/1",
      },
    ],
    new Date().toISOString(),
  );
});

test("offers response shape", async () => {
  await using t = await setup();
  const s = t.service;
  await s.addSnapshot(
    "city1",
    [
      {
        id: "1",
        price: 300,
        originalPrice: "300 dollars",
        lat: 27.0,
        lon: 34.0,
        rooms: 1,
        address: "street name, 12",
        url: "https://www.example.com/1",
      },
    ],
    new Date().toISOString(),
  );

  const all = await s.getOffers(defFilter, 10);
  assert.deepEqual(all, [
    {
      id: "1",
      price: 300,
      lat: 27.0,
      lon: 34.0,
      coords: [27.0, 34.0],
      rooms: 1,
      address: "street name, 12",
      url: "https://www.example.com/1",
    },
  ]);
});

test("snapshots", async () => {
  const t = await setup();
  await t.service.addSnapshot(
    "city1",
    [
      {
        id: "1",
        price: 300,
        originalPrice: "300 dollars",
        lat: 27.0,
        lon: 34.0,
        rooms: 1,
        address: "street name, 12",
        url: "https://www.example.com/1",
      },
      {
        id: "2",
        price: 300,
        originalPrice: "300 dollars",
        lat: 27.0,
        lon: 34.0,
        rooms: 1,
        address: "street name, 12",
        url: "https://www.example.com/2",
      },
    ],
    "2023-08-16T20:50:38.164Z",
  );

  await t.service.addSnapshot(
    "city1",
    [
      {
        id: "1",
        price: 300,
        originalPrice: "300 dollars",
        lat: 27.0,
        lon: 34.0,
        rooms: 1,
        address: "street name, 12",
        url: "https://www.example.com/1",
      },
    ],
    "2023-08-17T20:50:38.186Z",
  );

  await t.service.addSnapshot(
    "city1",
    [
      {
        id: "1",
        price: 300,
        originalPrice: "300 dollars",
        lat: 27.0,
        lon: 34.0,
        rooms: 1,
        address: "street name, 12",
        url: "https://www.example.com/1",
      },
      {
        id: "2",
        price: 300,
        originalPrice: "300 dollars",
        lat: 27.0,
        lon: 34.0,
        rooms: 1,
        address: "street name, 12",
        url: "https://www.example.com/2",
      },
    ],
    "2023-08-18T23:50:38.164Z",
  );

  const offers = await t.service.getOffers(defFilter, 10);
  assert.deepEqual(
    offers.map((x: any) => x.id),
    ["1", "2"],
  );
});

test("notifies subscribers", async () => {
  const t = await setup();
  await t.service.addSubscriber({
    email: "foo@example.com",
    lat: 20,
    lon: 30,
    maxPrice: 400,
    maxRadius: 1000,
  });

  await t.service.addSnapshot(
    "city1",
    [
      {
        id: "1",
        price: 300,
        originalPrice: "300 dollars",
        lat: 20.0,
        lon: 30.0,
        rooms: 1,
        address: "street name, 12",
        url: "https://www.example.com/1",
      },
    ],
    "2023-08-17T01:06:00.000Z",
  );
  await timers.setTimeout(100);
  assert.deepEqual(t.popMail("foo@example.com"), [
    {
      subject: "Flats update: 300 (300 dollars) 1r, R = 0 m",
      body: "$300 (300 dollars) 1r at street name, 12, R = 0 m\nhttps://www.example.com/1\nroute (YA): https://yandex.by/maps/?rtext=20,30~20,30&rtt=mt\nroute (GO): https://www.google.com/maps/dir/?api=1&origin=20,30&destination=20,30\n",
    },
  ]);
});

test("logs updates", async () => {
  await using t = await setup();
  const now = new Date("2023-09-04T15:48:56.677Z");
  await withFakeDate(now, () =>
    t.service.addSnapshot(
      "city1",
      [
        {
          id: "1",
          price: 300,
          originalPrice: "300 dollars",
          lat: 27.0,
          lon: 34.0,
          rooms: 1,
          address: "street name, 12",
          url: "https://www.example.com/1",
        },
      ],
      new Date().toISOString(),
    ),
  );

  const r = await t.db.query("select * from logs");
  assert.deepEqual(r.rows, [
    {
      t: new Date("2023-09-04T15:48:56.677Z"),
      name: "city1",
      message: null,
      count: 1,
    },
  ]);
});

test("login", async () => {
  await using t = await setup();
  await t.service.addUser("foo", "password");
  const r1 = await t.service.login("foo", "password1");
  assert.deepEqual(r1, { ok: false });
  const r = await t.service.login("foo", "password");
  assert.equal(r.ok, true);
  assert.equal(typeof r.token, "string");
});
