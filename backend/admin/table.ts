import * as tpl from "./tpl.ts";

export default (xs: any[]) => {
  if (xs.length === 0) {
    return "";
  }
  const keys = Object.keys(xs[0]);

  return `<table border="1">
      ${trh(keys)}
      ${xs.map((x: any) => tr(keys, x)).join("")}
    </table>`;
};

const trh = (keys: string[]) => {
  return `<tr>${keys.map((k) => `<th>${tpl.esc(k)}</th>`).join("")}</tr>`;
};

const tr = (keys: string[], x: any) => {
  return `<tr>${keys.map((k) => `<td>${tpl.esc(x[k])}</td>`).join("")}</tr>`;
};
