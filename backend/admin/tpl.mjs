export const esc = (s) => {
  if (s === undefined) {
    return "";
  }
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace("/>/g", "&gt;");
};
