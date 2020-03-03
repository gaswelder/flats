import * as readline from "readline";
import * as fs from "fs";
// import * as zlib from "zlib";

const create = () => {
  //   let _fd;
  //   let _fdname;

  const outputs = {};

  const getFile = (name) => {
    if (!outputs[name]) {
      const s = fs.createWriteStream(name);
      //   const z = zlib.createGzip({ level: 1 });
      //   z.pipe(s);
      outputs[name] = s;
    }
    return outputs[name];
    // if (!_fd) {
    //   _fd = fs.openSync(name, "a+");
    //   _fdname = name;
    //   return _fd;
    // }
    // if (name != _fdname) {
    //   fs.closeSync(_fd);
    //   _fd = fs.openSync(name, "a+");
    //   _fdname = name;
    // }
    // return _fd;
  };

  return {
    write(key, val) {
      const f = getFile(key);
      f.write(val + "\n");
      //   fs.writeSync(f, val + "\n");
    },
    close() {
      //   if (_fd) fs.closeSync(_fd);
      for (const z of Object.values(outputs)) {
        z.end();
      }
    },
  };
};

const main = async () => {
  const lines = readline.createInterface({ input: process.stdin });
  const spread = create();
  for await (const line of lines) {
    const m = line.match(/\s+/);
    const key = line.substring(0, m.index);
    const val = line.substring(m.index + m[0].length, line.length);
    spread.write(key, val);
  }
  spread.close();
};

main();
