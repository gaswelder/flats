import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// https://cheatsheetseries.owasp.org/cheatsheets/Password_Hashing_Cheat_Sheet.html
const KEYLEN = 64;
const SALT_BYTES = 16;
const COST = { N: 16384, r: 8, p: 1 };

const scryptAsync = (
  password: string,
  salt: Buffer,
  keylen: number,
  cost: { N: number; r: number; p: number },
) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, cost, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });

export const hashPassword = async (password: string) => {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(password, salt, KEYLEN, COST);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
};

export const verifyPassword = async (
  password: string,
  stored: string,
): Promise<boolean> => {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) {
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const derived = await scryptAsync(password, salt, KEYLEN, COST);
  const expected = Buffer.from(hashHex, "hex");
  if (derived.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(derived, expected);
};
