export const timer = (log) => {
  let t = Date.now();
  return (name, n) => {
    const t2 = Date.now();
    const dt = t2 - t;
    t = t2;
    log.info("timer", { name, dt, n });
  };
};
