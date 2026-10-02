import { expect, it } from "vitest";
import { generationInputSchema, resolveGenerationConfig } from "../../src/modules/books/generation-input";
import { generateTemplate, validateTemplate, arithmetic } from "../../src/modules/puzzles/templates/engine";
import { mathTopics } from "../../src/modules/puzzles/templates/math-topics";
import { templateScene } from "../../src/modules/puzzles/templates/scene";
import { renderTemplatePdf } from "../../src/services/pdf/templates";

const input = { title: "Math Practice", theme: "Old word topic", audience: "Kids", activityPages: 1, difficulty: "easy" as const, templateKey: "math-maze" as const };

for (const { key, label } of mathTopics) {
  it.each(["easy", "medium", "hard"] as const)(`generates numeric ${key} mazes and checked answers (%s)`, async difficulty => {
    const config = resolveGenerationConfig(generationInputSchema.parse({ ...input, mathTopic: key, difficulty, wordSource: "custom", customWords: "Up, invalid2" }));
    expect(config.words).toEqual([]);
    expect(config.theme).toBe(label);
    expect(config.mathTopic).toBe(key);
    const puzzle = generateTemplate("math-maze", config, "math-test");
    expect(puzzle).toEqual(generateTemplate("math-maze", config, "math-test"));
    expect(puzzle.data.kind).toBe("math-maze");
    if (puzzle.data.kind !== "math-maze") throw new Error("Wrong template");
    expect(puzzle.data.words).toBeUndefined();
    expect(puzzle.solution.text).toEqual([]);
    expect(puzzle.solution.values.every(Number.isFinite)).toBe(true);
    expect(validateTemplate(puzzle, config.words)).toBe(true);
    if (key === "division") {
      for (const expression of puzzle.data.expressions) {
        const [dividend, divisor] = expression.split(" / ").map(Number);
        expect(divisor).toBeGreaterThan(0);
        expect(dividend! % divisor!).toBe(0);
      }
    }
    const scene = templateScene(config, 1, "ANSWER", puzzle);
    const cellWidth = 444 / puzzle.data.size;
    for (const expression of puzzle.data.expressions) {
      expect(scene.some(op => op.kind === "text" && op.text === expression && op.width <= cellWidth - 10)).toBe(true);
    }
    expect((await renderTemplatePdf(config, [puzzle])).length).toBeGreaterThan(1000);
    puzzle.solution.values[0]! += 1;
    expect(validateTemplate(puzzle)).toBe(false);
  });
}

it.each([
  ["8 + 7", 15], ["18 - 9", 9], ["7 x 8", 56], ["56 / 8", 7],
  ["2/3 of 18", 12], ["0.1 + 0.2", 0.3], ["25% of 80", 20],
  ["-8 - 3", -11], ["4^3", 64], ["sqrt(144)", 12], ["3 + 4 x 5", 23],
] as const)("evaluates %s independently", (expression, answer) => {
  expect(arithmetic(expression)).toBe(answer);
});

it.each(["1 / 0", "1/0 of 12", "1 + 2; alert(1)", "unknown"])("rejects unsafe or invalid math: %s", expression => {
  expect(Number.isNaN(arithmetic(expression))).toBe(true);
});

it("defaults to addition without requiring words and rejects unknown topics", () => {
  expect(resolveGenerationConfig(input).mathTopic).toBe("addition");
  expect(() => generationInputSchema.parse({ ...input, mathTopic: "gardening" })).toThrow();
});
