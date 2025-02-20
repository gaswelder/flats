import * as tpl from "./tpl.mjs";

export default (xs) => {
  if (xs.length == 0) {
    return "";
  }
  const keys = Object.keys(xs[0]);
  const row = (x) =>
    `<tr>${keys.map((k) => `<td>${tpl.esc(x[k])}</td>`).join("")}</tr>`;
  return `<table border="1">
        <tr>${keys.map((k) => `<th>${tpl.esc(k)}</th>`).join("")}</tr>
        ${xs.map(row).join("")}
      </table>`;
};
