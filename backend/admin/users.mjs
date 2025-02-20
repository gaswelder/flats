import nav from "./nav.mjs";
import table from "./table.mjs";
import { wrapper } from "./wrapper.mjs";

export default async (core) => {
  const subscribers = await core.storage().getUsers();
  return wrapper(`
    ${nav()}
    <h2>Users</h2>

    <form method="post">
    ${table(
      subscribers.map((x) => {
        return {
          ...x,
          // del: { raw: `<button name="del" value="${x.id}">del</button>` },
        };
      })
    )}
    </form>
  `);
};
