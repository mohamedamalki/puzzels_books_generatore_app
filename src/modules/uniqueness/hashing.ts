import { createHash } from "node:crypto";
import type { Json } from "../../lib/json";

export const CANONICALIZER_VERSION = "1.0.0";

/** Object order is irrelevant; array order remains semantic. No lossy text folding here. */
export function canonicalJson(value: Json): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Non-finite JSON number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(item => canonicalJson(item)).join(",")}]`;
  if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError("Expected plain JSON");
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key]!)}`).join(",")}}`;
}

export function contentHash(kind: string, semanticContent: Json): string {
  return createHash("sha256").update(canonicalJson({ version: CANONICALIZER_VERSION, kind, content: semanticContent })).digest("hex");
}

export function normalizeText(text: string): string {
  return text.normalize("NFKC").toLowerCase().trim().replace(/\s+/gu, " ");
}

export function wordSetHash(words: readonly string[]): string {
  const normalized = words.map(normalizeText);
  if (normalized.some(word => !word)) throw new TypeError("Empty word");
  if (new Set(normalized).size !== normalized.length) throw new TypeError("Duplicate target word");
  return contentHash("word-set", normalized.sort());
}
