import nav from "./nav.ts";
import table from "./table.ts";
import { wrapper } from "./wrapper.ts";

export default async (core: any): Promise<string> => {
  const updates = await core.getUpdates();
  return wrapper(`
    ${nav()}
    <h2>Updates</h2>
    ${table(updates)}`);
};
