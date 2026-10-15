export const timer = (
  log: { info: (msg: string, data?: any) => void }
) => {
  let t = Date.now();
  return (name: string, n?: any) => {
    const t2 = Date.now();
    const ms = t2 - t;
    t = t2;
    log.info("timer", { name, ms, n });
  };
};
