import * as tpl from "./tpl.mjs";

export default (xs) => {
  if (xs.length == 0) {
    return "";
  }
  const keys = Object.keys(xs[0]);

  return `<table border="1">
      ${trh(keys)}
      ${xs.map((x) => tr(keys, x)).join("")}
    </table>`;
};

const trh = (keys) => {
  return `<tr>${keys.map((k) => `<th>${tpl.esc(k)}</th>`).join("")}</tr>`;
};

const tr = (keys, x) => {
  return `<tr>${keys.map((k) => `<td>${tpl.esc(x[k])}</td>`).join("")}</tr>`;
};
