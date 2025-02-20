export const esc = (s) => {
  if (s === undefined) {
    return "";
  }
  if (typeof s == "object" && s && s.raw) {
    return s.raw;
  }
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace("/>/g", "&gt;");
};
