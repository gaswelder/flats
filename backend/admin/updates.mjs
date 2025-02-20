import nav from "./nav.mjs";
import table from "./table.mjs";
import { wrapper } from "./wrapper.mjs";

export default async (core) => {
  const updates = await core.getUpdates();
  return wrapper(`
    ${nav()}
    <h2>Updates</h2>
    ${table(updates)}`);
};
