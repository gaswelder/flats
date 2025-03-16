export const timer = (log) => {
  let t = Date.now();
  return (name, n) => {
    const t2 = Date.now();
    const ms = t2 - t;
    t = t2;
    log.info("timer", { name, ms, n });
  };
};
