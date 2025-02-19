export const getStamp = (type) => {
  const ts = new Date();
  const y = ts.getFullYear();
  const m = (ts.getMonth() + 1).toString().padStart(2, "0");
  const d = ts.getDate().toString().padStart(2, "0");
  switch (type) {
    case "monthly":
      return `${y}-${m}`;
    case "daily":
      return `${y}-${m}-${d}`;
    default:
      throw new Error("unknown stamp type: " + type);
  }
};
