import { describe, expect, it } from "vitest";
import { canonicalJson, contentHash, wordSetHash } from "../../src/modules/uniqueness/hashing";
import { deriveSeed, seededRandom } from "../../src/modules/puzzles/core/seed";

describe("canonical content identity", () => {
  it("ignores object key order, including nested keys", () => {
    expect(contentHash("puzzle", { z: 1, a: { y: 2, b: 3 } })).toBe(contentHash("puzzle", { a: { b: 3, y: 2 }, z: 1 }));
  });
  it("preserves meaningful array order and domain separation", () => {
    expect(contentHash("puzzle", [1, 2])).not.toBe(contentHash("puzzle", [2, 1]));
    expect(contentHash("puzzle", [1, 2])).not.toBe(contentHash("page", [1, 2]));
  });
  it("rejects invalid JSON numbers", () => {
    expect(() => canonicalJson({ value: Infinity })).toThrow();
    expect(() => canonicalJson({ value: NaN })).toThrow();
  });
  it("normalizes word sets but preserves accents", () => {
    expect(wordSetHash([" Rose ", "TULIP"])).toBe(wordSetHash(["tulip", "rose"]));
    expect(wordSetHash(["café"])).not.toBe(wordSetHash(["cafe"]));
    expect(() => wordSetHash(["Rose", " rose "])).toThrow("Duplicate");
    expect(() => wordSetHash([" "])).toThrow("Empty");
  });
});

describe("reproducible seeds", () => {
  it("separates retry seeds and avoids ambiguous concatenation", () => {
    expect(deriveSeed("a", "b", 0)).not.toBe(deriveSeed("a", "b", 1));
    expect(deriveSeed("ab", "c")).not.toBe(deriveSeed("a", "bc"));
    expect(() => deriveSeed("a", "b", -1)).toThrow();
  });
  it("produces repeatable random streams in [0, 1)", () => {
    const first = seededRandom("8472938402");
    const second = seededRandom("8472938402");
    const values = Array.from({ length: 10000 }, () => first());
    expect(values).toEqual(Array.from({ length: 10000 }, () => second()));
    expect(values.every(value => value >= 0 && value < 1)).toBe(true);
  });
});
