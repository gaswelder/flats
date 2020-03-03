class PGError extends Error {
  constructor(pgerr) {
    super(pgerr.message);
    this.code = pgerr.code;
  }
}

class Inject {
  constructor(value) {
    this.value = value;
  }
}

export const pgx = (pool) => {
  return {
    ...wrap(pool),

    inject(value) {
      return new Inject(value);
    },

    async transaction(f) {
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

const wrap = (conn) => {
  return {
    async query(q, args) {
      try {
        return await conn.query(q, args);
      } catch (err) {
        throw new PGError(err);
      }
    },

    async q(parts, ...values) {
      let n = 1;
      const placeholder = () => "$" + n++;
      const args = [];
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

    async batchInsert(table, rows) {
      if (rows.length == 0) {
        return;
      }
      const header = Object.keys(rows[0]);
      const values = [];
      let q = `insert into ${table} (${header}) values`;
      let i = 0;

      const val = (v) => {
        values.push(v);
        return "$" + values.length;
      };

      const flush = async () => {
        await conn.query(q, values);
        q = `insert into ${table} (${header}) values`;
        values.length = 0;
        i = 0;
      };

      for (const row of rows) {
        if (values.length > 40000) {
          await flush();
        }
        const tuple = [];
        for (const k of header) {
          const v = row[k];
          if (typeof v == "function") {
            tuple.push(v(val));
          } else {
            tuple.push(val(v));
          }
        }
        if (i++) {
          q += ",";
        }
        q += `(${tuple})`;
      }
      if (values.length > 0) {
        await flush();
      }
    },
  };
};
