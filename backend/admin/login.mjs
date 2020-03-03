import * as tpl from "./tpl.mjs";
import { wrapper } from "./wrapper.mjs";

export default async (err) => {
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
