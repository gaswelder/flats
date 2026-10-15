import * as tpl from "./tpl.ts";
import { wrapper } from "./wrapper.ts";

export default async (err?: any): Promise<string> => {
  return wrapper(`
    <p>${tpl.esc(err)}</p>
    <form method="post">
        <div>
          <label>Login</label>
          <input name="login" required>
        </div>
        <div>
          <label>Password</label>
          <input name="password" type="password" required>
        </div>
        <button type="submit">Login</button>
      </form>
    `);
};
