const out = (level: string, msg: string, data?: any) => {
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
  info(msg: string, data?: any) {
    out("info", msg, data);
  },
  warn(msg: string, data?: any) {
    out("warning", msg, data);
  },
  error(msg: string, data?: any) {
    out("error", msg, formatData(data));
  },
};

const formatData = (data: any) => {
  if (!data) return data;
  const kv = Object.entries(data as any).flatMap((e: any) => {
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
