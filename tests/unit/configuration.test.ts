import { expect, it } from "vitest";
import { puzzleMixSchema, wordSearchConfigurationSchema } from "../../src/modules/books/configuration";
import { PluginRegistry } from "../../src/lib/registry";

it("checks word length against allowed directions on rectangular grids", () => {
  const config = { rows: 8, columns: 20, wordsPerPuzzle: 10, minWordLength: 3, maxWordLength: 15, directions: ["S"] };
  expect(wordSearchConfigurationSchema.safeParse(config).success).toBe(false);
  expect(wordSearchConfigurationSchema.safeParse({ ...config, directions: ["E"] }).success).toBe(true);
  expect(wordSearchConfigurationSchema.safeParse({ ...config, directions: ["E", "E"] }).success).toBe(false);
});

it("requires mixed-book allocations to total 100 with unique engines", () => {
  expect(puzzleMixSchema.safeParse([{ engineKey: "word-search", percentage: 60 }, { engineKey: "maze", percentage: 40 }]).success).toBe(true);
  expect(puzzleMixSchema.safeParse([{ engineKey: "word-search", percentage: 60 }]).success).toBe(false);
  expect(puzzleMixSchema.safeParse([{ engineKey: "maze", percentage: 50 }, { engineKey: "maze", percentage: 50 }]).success).toBe(false);
});

it("resolves exact engine versions and rejects accidental replacement", () => {
  const registry = new PluginRegistry();
  const plugin = { key: "word-search", version: "1.0.0" };
  registry.register(plugin);
  expect(registry.get("word-search", "1.0.0")).toBe(plugin);
  expect(() => registry.register(plugin)).toThrow("already registered");
  expect(() => registry.get("word-search", "2.0.0")).toThrow("Unsupported");
  expect(() => registry.get("word-search", "latest")).toThrow();
});
