import { createHash } from "node:crypto";

export function deriveSeed(bookSeed: string, pageKey: string, attempt = 0): string {
  if (!Number.isSafeInteger(attempt) || attempt < 0) throw new TypeError("Invalid attempt");
  return createHash("sha256").update(JSON.stringify(["seed-v1", bookSeed, pageKey, attempt])).digest("hex");
}

/** Stable deterministic PRNG for puzzle choices; never use for authentication or tokens. */
export function seededRandom(seed: string): () => number {
  let state = createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
