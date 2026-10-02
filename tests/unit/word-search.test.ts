import { describe, expect, it } from "vitest";
import { generateWordSearch, validateWordSearch, shuffle } from "../../src/modules/puzzles/word-search/engine";
import { seededRandom } from "../../src/modules/puzzles/core/seed";
import { wordBanks } from "../../src/modules/books/word-banks";
import { resolveGenerationConfig } from "../../src/modules/books/generation-input";
import { contentHash } from "../../src/modules/uniqueness/hashing";

describe("word-search engine", () => {
  const words = ["ROSE", "TULIP", "GARDEN", "COMPOST", "LAVENDER", "DAISY", "FLOWER", "SEED", "HERB", "MOSS", "SPADE", "THYME"];
  it("recreates the same puzzle from the same configuration, words and seed", () => {
    expect(generateWordSearch({ size: 15, difficulty: "hard" }, words, "repeat")).toEqual(generateWordSearch({ size: 15, difficulty: "hard" }, words, "repeat"));
  });
  it("rejects duplicate targets, invalid characters and impossible lengths", () => {
    expect(() => generateWordSearch({ size: 15, difficulty: "easy" }, [...words, "ROSE"], "x")).toThrow();
    expect(() => generateWordSearch({ size: 15, difficulty: "easy" }, ["CAFÉ", "DOG", "CAT"], "x")).toThrow();
    expect(() => generateWordSearch({ size: 10, difficulty: "easy" }, ["ABCDEFGHIJKLMNO", "DOG", "CAT"], "x")).toThrow();
  });
  it("detects corrupted answers and out-of-bounds coordinates", () => {
    const puzzle = generateWordSearch({ size: 15, difficulty: "easy" }, words, "check");
    puzzle.solution.placements[0]!.row = 99;
    expect(validateWordSearch(puzzle, { size: 15, difficulty: "easy" }, words).passed).toBe(false);
  });
  it("generates 20 correctly placed words for every collection and difficulty", () => {
    for (const [key, bank] of Object.entries(wordBanks)) {
      for (const difficulty of ["easy", "medium", "hard"] as const) {
        for (let i = 0; i < 10; i++) {
          const seed = `twenty:${key}:${difficulty}:${i}`;
          const selected = shuffle([...new Set(bank.words)], seededRandom(seed)).slice(0, 20);
          const puzzle = generateWordSearch({ size: 15, difficulty }, selected, seed);
          expect(puzzle.data.words).toHaveLength(20);
          expect(puzzle.solution.placements).toHaveLength(20);
          expect(validateWordSearch(puzzle, { size: 15, difficulty }, selected).passed).toBe(true);
        }
      }
    }
  }, 30000);
  it("validates 10,000 seeded puzzles with no duplicate grids", () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      const difficulty = (["easy", "medium", "hard"] as const)[i % 3]!;
      const pool = [...new Set(wordBanks.gardening!.words)];
      const selected = shuffle(pool, seededRandom(`input:${i}`)).slice(0, 12);
      const puzzle = generateWordSearch({ size: 15, difficulty }, selected, `soak:${i}`);
      const report = validateWordSearch(puzzle, { size: 15, difficulty }, selected);
      if (!report.passed) throw new Error(`Invalid puzzle ${i}: ${JSON.stringify(report)}`);
      const hash = contentHash("grid", puzzle.data.grid);
      if (hashes.has(hash)) throw new Error(`Repeated grid at ${i}`);
      hashes.add(hash);
    }
    expect(hashes.size).toBe(10000);
  }, 120000);
});

it("deduplicates word banks and requires enough English words for custom sets", () => {
  const base = { title: "Food puzzles", theme: "Food", audience: "Adults", difficulty: "easy" as const, activityPages: 10 };
  const config = resolveGenerationConfig(base);
  expect(config.wordsPerPuzzle).toBe(20);
  expect(new Set(config.words).size).toBe(config.words.length);
  expect(() => resolveGenerationConfig({ ...base, customWords: "cat, dog, bird" })).toThrow("at least 24");
  expect(() => resolveGenerationConfig({ ...base, theme: "Unknown" })).toThrow("Choose a built-in");
});
