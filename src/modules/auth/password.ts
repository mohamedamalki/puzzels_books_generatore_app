import { hash, verify } from "@node-rs/argon2";

export function hashPassword(password: string) {
  // The binding defaults to Argon2id; avoid importing its ambient const enum.
  return hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}
export async function verifyPassword(encoded: string, password: string) {
  try { return await verify(encoded, password); } catch { return false; }
}
