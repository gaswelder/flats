import nav from "./nav.ts";
import table from "./table.ts";
import { wrapper } from "./wrapper.ts";

export default async (core: any): Promise<string> => {
  const users = await core.storage().getUsers();
  return wrapper(`
    ${nav()}
    <h2>Users</h2>

    <form method="post">
    ${table(
      users.map((x: any) => {
        return {
          ...x,
          // del: { raw: `<button name="del" value="${x.id}">del</button>` },
        };
      })
    )}
    </form>
  `);
};
