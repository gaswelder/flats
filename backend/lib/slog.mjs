const out = (level, msg, data) => {
  process.stdout.write(
    JSON.stringify({
      ...data,
      t: new Date().toISOString(),
      msg,
      level,
    }) + "\n"
  );
};

export const log = {
  info(msg, data) {
    out("info", msg, data);
  },
  warn(msg, data) {
    out("warning", msg, data);
  },
  error(msg, data) {
    out("error", msg, formatData(data));
  },
};

const formatData = (data) => {
  if (!data) return data;
  const kv = Object.entries(data).flatMap((e) => {
    if (e[1] instanceof Error) {
      const k = e[0];
      const err = e[1];
      return [
        [k + "_name", err.name],
        [k + "_stack", err.stack],
        [k + "_message", err.message],
      ];
    }
    return [e];
  });
  return Object.fromEntries(kv);
};
