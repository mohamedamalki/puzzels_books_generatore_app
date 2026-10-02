import { expect, it } from "vitest";
import { resolveGenerationConfig } from "../../src/modules/books/generation-input";
import { puzzleTemplates, minimumTemplateWords } from "../../src/modules/puzzles/templates/catalog";
import { generateTemplate, validateTemplate } from "../../src/modules/puzzles/templates/engine";
import { templateScene } from "../../src/modules/puzzles/templates/scene";
import { contentHash } from "../../src/modules/uniqueness/hashing";

const words = "PUMPKIN GHOST WITCH BROOM SPIDER CANDY COSTUME BAT MOON NIGHT TRICK TREAT MASK CANDLE LANTERN RAVEN BLACK ORANGE SKELETON MONSTER VAMPIRE CAULDRON COBWEB HAUNTED".split(" ");
const input = { title: "Halloween Adventures", theme: "Halloween", audience: "Kids", difficulty: "easy" as const, activityPages: 3, wordSource: "custom", customWords: words.join("\n") };

it.each(["easy", "medium", "hard"] as const)("accepts and decodes two-letter Secret Code words (%s)", difficulty => {
  const vocabulary = ["Up", "Go", "In", "On", "At", "To", "By", "Of", "It", "We"];
  const config = resolveGenerationConfig({ ...input, templateKey: "secret-code", difficulty,
    customWords: vocabulary.map((word, i) => `${i + 1}. ${word} &#x20;`).join("\r\n") });
  expect(config.words).toEqual(vocabulary.map(word => word.toUpperCase()));
  const puzzle = generateTemplate("secret-code", config, `short-words:${difficulty}`);
  expect(puzzle.data.kind).toBe("secret-code");
  if (puzzle.data.kind !== "secret-code") throw new Error("Expected Secret Code");
  expect(puzzle.data.encoded).toHaveLength(difficulty === "easy" ? 6 : difficulty === "medium" ? 8 : 10);
  expect(puzzle.data.encoded.every(codes => codes.length === 2)).toBe(true);
  expect(validateTemplate(puzzle, config.words)).toBe(true);
  for (const mode of ["PUZZLE", "ANSWER"] as const) {
    expect(templateScene(config, 1, mode, puzzle).length).toBeGreaterThan(0);
  }
});

it.each(["U", "Up2", "Up!", "abcdefghijklmnop"])("rejects invalid Secret Code vocabulary: %s", word => {
  expect(() => resolveGenerationConfig({ ...input, templateKey: "secret-code", customWords: `${input.customWords}\n${word}` })).toThrow(`Invalid word: "${word}"`);
});

for (const { key } of puzzleTemplates) {
  if (key === "math-maze") continue;
  it(`${key} preserves a topic and custom vocabulary, with its own minimum word count`, () => {
    const config = resolveGenerationConfig({ ...input, templateKey: key });
    expect(config.theme).toBe("Halloween");
    expect(config.words).toEqual(words);
    const minimum = minimumTemplateWords[key];
    expect(() => resolveGenerationConfig({ ...input, templateKey: key, customWords: words.slice(0, minimum - 1).join(",") })).toThrow(`at least ${minimum}`);
    expect(resolveGenerationConfig({ ...input, templateKey: key, customWords: words.slice(0, minimum).join(",") }).words).toHaveLength(minimum);
    expect(() => resolveGenerationConfig({ ...input, templateKey: key, customWords: "" })).toThrow();
  });

  if (key === "word-search") continue;
  it(`${key} actually uses the supplied words in valid saved puzzles and printable answers`, () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const config = resolveGenerationConfig({ ...input, templateKey: key, difficulty });
      const puzzle = generateTemplate(key, config, `topic:${difficulty}`), data = puzzle.data;
      expect(validateTemplate(puzzle, config.words)).toBe(true);
      expect(validateTemplate(puzzle, ["UNRELATED", "VOCABULARY"])).toBe(false);
      expect(generateTemplate(key, config, `topic:${difficulty}`)).toEqual(puzzle);
      const used = data.kind === "crossword" ? data.entries.map(entry => entry.word)
        : data.kind === "logic-puzzle" ? [...data.pets, ...data.foods]
        : data.kind === "secret-code" ? puzzle.solution.text : data.words!;
      expect(used.length).toBeGreaterThan(0);
      expect(used.every(word => words.includes(word))).toBe(true);
      if (data.kind === "crossword") {
        data.entries.forEach(entry => {
          expect(entry.clue).toMatch(/^Unscramble: /);
          expect([...entry.clue.replace("Unscramble: ", "")].sort()).toEqual([...entry.word].sort());
          expect(entry.clue).not.toBe(`Unscramble: ${entry.word}`);
        });
      }
      const scene = templateScene(config, 5, "ANSWER", puzzle);
      if (data.kind !== "secret-code") for (const word of used) expect(scene.some(op => op.kind === "text" && op.text.includes(word))).toBe(true);
      const otherConfig = resolveGenerationConfig({ ...input, customWords: undefined, wordSource: "space", templateKey: key, difficulty });
      expect(contentHash(key, generateTemplate(key, otherConfig, `topic:${difficulty}`).data)).not.toBe(contentHash(key, data));
      for (const op of scene) {
        expect(op.y).toBeLessThanOrEqual(756);
        if (op.kind === "rect") expect(op.y + op.h).toBeLessThan(741);
      }
    }
  });
}

it("keeps legacy picture and arithmetic books unchanged when no word source was supplied", () => {
  for (const key of ["picture-sudoku", "i-spy", "color-by-code", "math-maze", "logic-puzzle"] as const) {
    const config = resolveGenerationConfig({ ...input, templateKey: key, customWords: undefined, wordSource: undefined });
    expect(config.words).toEqual([]);
    expect(validateTemplate(generateTemplate(key, config, "legacy-topic"))).toBe(true);
  }
});

it("rejects invalid theme words instead of falling back to unrelated content", () => {
  expect(() => resolveGenerationConfig({ ...input, templateKey: "i-spy", customWords: `${input.customWords}\ninvalid2` })).toThrow('Invalid word: "invalid2"');
  expect(() => resolveGenerationConfig({ ...input, templateKey: "crossword", customWords: `${input.customWords}\nCHRYSANTHEMUM` })).toThrow("3 to 12");
});
