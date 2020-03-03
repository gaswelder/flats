import * as tpl from "./tpl.mjs";
import { wrapper } from "./wrapper.mjs";

export default async (core) => {
  const subscribers = await core.getSubscribers();
  const updates = await core.getUpdates();
  return wrapper(`
<h2>Updates</h2>
${table(updates)}

<h2>Subscribers</h2>
${table(subscribers)}

<form method="post">
  <div>
    <label>Email</label>
    <input name="email" type="email" required>
  </div>
  <div>
    <label>Latitude, longitude</label>
    <input name="lat">
    <input name="lon">
  </div>
  <div>
    <label>Max. price</label>
    <input name="max_price">
  </div>
  <div>
    <label>Max. radius</label>
    <input name="max_radius">
  </div>
  <button name="form" value="subscriber" type="submit">Add</button>
</form>
  `);
};

const table = (xs) => {
  if (xs.length == 0) {
    return "";
  }
  const keys = Object.keys(xs[0]);
  const row = (x) =>
    `<tr>${keys.map((k) => `<td>${tpl.esc(x[k])}</td>`).join("")}</tr>`;
  return `<table border="1">
      <tr>${keys.map((k) => `<th>${tpl.esc(k)}</th>`).join("")}</tr>
      ${xs.map(row)}
    </table>`;
};
