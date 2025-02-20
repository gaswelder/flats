import nav from "./nav.mjs";
import table from "./table.mjs";
import { wrapper } from "./wrapper.mjs";

export default async (core) => {
  const subscribers = await core.getSubscribers();
  return wrapper(`

${nav()}

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
