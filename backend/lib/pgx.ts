import { Pool } from "pg";

class PGError extends Error {
  constructor(public pgerr: Error) {
    super(pgerr.message);
    this.name = "PGError";
  }
}

export class Inject {
  constructor(public value: string | number) {}
}

export type PgDB = {
  query(q: string, args?: any[]): Promise<any>;
  q(parts: TemplateStringsArray, ...values: any[]): Promise<any>;
  inject(value: string | number): Inject;
  batchInsert(table: string, rows: any[]): Promise<void>;
  transaction<T>(f: (conn: PgDB) => Promise<T>): Promise<T>;
};

export const pgx = (pool: Pool): PgDB => {
  const wrap = (conn: any) => {
    return {
      async query(q: string, args: any[] = []) {
        try {
          return await conn.query(q, args);
        } catch (err) {
          throw new PGError(err as Error);
        }
      },

      async q(parts: TemplateStringsArray, ...values: any[]) {
        let n = 1;
        const placeholder = () => "$" + n++;
        const args: any[] = [];
        let q = parts[0];
        for (let i = 1; i < parts.length; i++) {
          const v = values[i - 1];
          if (v instanceof Inject) {
            q += v.value;
          } else {
            q += placeholder();
            args.push(v);
          }
          q += parts[i];
        }
        return this.query(q, args);
      },

      inject(value: string | number) {
        return new Inject(value);
      },

      async batchInsert(table: string, rows: any[]) {
        if (rows.length === 0) {
          return;
        }
        const header = Object.keys(rows[0]);
        const values: any[] = [];
        let q = `insert into ${table} (${header.join(", ")}) values`;
        let i = 0;

        const flush = async () => {
          await conn.query(q, values);
          q = `insert into ${table} (${header.join(", ")}) values`;
          values.length = 0;
          i = 0;
        };

        for (const row of rows) {
          if (values.length > 40000) {
            await flush();
          }
          const tuple: string[] = [];
          for (const k of header) {
            const v = row[k];
            if (typeof v === "function") {
              tuple.push(
                v((v2: any) => {
                  values.push(v2);
                  return "$" + values.length;
                })
              );
            } else {
              values.push(v);
              tuple.push("$" + values.length);
            }
          }
          if (i++) {
            q += ",";
          }
          q += `(${tuple.join(", ")})`;
        }
        if (values.length > 0) {
          await flush();
        }
      },

      async transaction<T>(f: (conn: PgDB) => Promise<T>) {
        const conn2 = await pool.connect();
        await conn2.query("begin");
        try {
          const r = await f(wrap(conn2));
          await conn2.query("commit");
          return r;
        } catch (err) {
          await conn2.query("rollback");
          throw err;
        } finally {
          conn2.release();
        }
      },
    };
  };

  return {
    ...wrap(pool),
    inject(value: string | number) {
      return new Inject(value);
    },
    async transaction<T>(f: (conn: PgDB) => Promise<T>) {
      const conn = await pool.connect();
      await conn.query("begin");
      try {
        const r = await f(wrap(conn));
        await conn.query("commit");
        return r;
      } catch (err) {
        await conn.query("rollback");
        throw err;
      } finally {
        conn.release();
      }
    },
  };
};
