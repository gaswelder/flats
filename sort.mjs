import * as fs from "fs";
import * as readline from "readline";

const getProvider = (name, obj) => {
  // // offers-bazaraki-2022-11-09T15:56:17.103Z.json.jsonl
  let m = name.match(/offers-([a-z\-\.]+)-(.*?)\.json\.jsonl/);
  if (m) {
    return m[1];
  }

  m = obj.id.match(/^([a-z\-.]+):\d+$/);
  if (m) {
    return m[1];
  }

  // if (m) {
  //   console.log(name, m);
  // }
  console.log({ name, obj });
  process.exit(1);
};

const getTs = (name, obj) => {
  let m = name.match(/offers-([a-z\-\.]+)-(.*?)\.json\.jsonl/);
  if (m) {
    return m[2];
  }

  return null;
};

async function* rows() {
  const ls = fs.readdirSync("tmp");
  let i = 0;
  for (const name of ls) {
    process.stderr.write(`${++i}/${ls.length} ${name}\n`);
    const s = fs.createReadStream("tmp/" + name);
    const lines = readline.createInterface({ input: s });
    for await (const line of lines) {
      const obj = JSON.parse(line);
      if (!("_data" in obj)) obj._data = null;
      if (!("provider" in obj)) {
        obj.provider = getProvider(name, obj);
      }
      if (obj.coords) {
        obj.lat = obj.coords[0];
        obj.lon = obj.coords[1];
        delete obj.coords;
      }
      if ("original_price" in obj) {
        obj.originalPrice = obj.original_price;
        delete obj.original_price;
      }
      if (!("originalPrice" in obj)) obj.originalPrice = null;
      if (!obj.ts) obj.ts = getTs(name, obj);
      obj._file = name;
      yield obj;
    }
    s.close();
  }
}

const main = async () => {
  //   const seen = new Set();
  for await (const obj of rows()) {
    // const keys = Object.keys(obj).sort().join(",");
    // if (seen.has(keys)) continue;
    // seen.add(keys);
    // console.log(keys);
    let key;
    if (obj.ts) {
      const m = obj.ts.match(/(\d\d\d\d-\d\d)/);
      key = m[1];
    }
    if (!key) {
      const m = obj._file.match(/(\d\d\d\d-\d\d)/);
      key = m[1];
    }
    //
    process.stdout.write(`${key}\t${JSON.stringify(obj)}\n`);
  }
};

main();
