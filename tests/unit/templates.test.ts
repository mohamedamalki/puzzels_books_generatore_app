import { expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { puzzleTemplates, everydayClues } from "../../src/modules/puzzles/templates/catalog";
import { generateTemplate, validateTemplate, solveSudoku, solveLogic, mazeRoute, arithmetic } from "../../src/modules/puzzles/templates/engine";
import { templateScene } from "../../src/modules/puzzles/templates/scene";
import { resolveGenerationConfig, generationInputSchema } from "../../src/modules/books/generation-input";
import { renderTemplatePdf } from "../../src/services/pdf/templates";

const base = { title: "Template Test", theme: "Gardening", audience: "Kids", difficulty: "easy" as const, activityPages: 2 };
for (const template of puzzleTemplates.filter(t => t.key !== "word-search")) {
  it(`${template.name}: reproduces valid puzzles across every difficulty and seed`, () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) for (let i = 0; i < 12; i++) {
      const config = resolveGenerationConfig({ ...base, templateKey: template.key, difficulty }), seed = `${template.key}:${difficulty}:${i}`;
      const puzzle = generateTemplate(template.key, config, seed);
      expect(validateTemplate(puzzle)).toBe(true);
      if (i === 0) expect(generateTemplate(template.key, config, seed)).toEqual(puzzle);
      const scene = templateScene(config, 4, "ANSWER", puzzle);
      for (const op of scene) {
        expect(Number.isFinite(op.x) && Number.isFinite(op.y)).toBe(true);
        expect(op.y).toBeLessThanOrEqual(756);
        if (op.kind === "rect") { expect(op.x + op.w).toBeLessThanOrEqual(558); expect(op.y + op.h).toBeLessThan(741); }
      }
      if (puzzle.data.kind === "picture-sudoku") expect(solveSudoku(puzzle.data.grid)).toEqual([puzzle.solution.grid]);
      if (puzzle.data.kind === "logic-puzzle") expect(solveLogic(puzzle.data.clues)).toEqual([puzzle.solution.values]);
      if (puzzle.data.kind === "math-maze") expect(mazeRoute(puzzle.data.size, puzzle.data.walls)).toEqual(puzzle.solution.route);
    }
  }, 30000);
  it(`${template.name}: exports the title, activities and answers at US Letter size`, async () => {
    const config = resolveGenerationConfig({ ...base, templateKey: template.key });
    const puzzles = [0, 1].map(i => generateTemplate(template.key, config, `pdf:${i}`));
    const pdf = await PDFDocument.load(await renderTemplatePdf(config, puzzles));
    expect(pdf.getPageCount()).toBe(5);
    expect(pdf.getPages().every(page => page.getWidth() === 612 && page.getHeight() === 792)).toBe(true);
    expect((await PDFDocument.load(await renderTemplatePdf(config, puzzles, true))).getPageCount()).toBe(2);
    await expect(renderTemplatePdf(config, puzzles.slice(0, 1))).rejects.toThrow("Missing puzzle pages");
  });
  it(`${template.name}: detects a corrupted saved answer`, () => {
    const puzzle = generateTemplate(template.key, resolveGenerationConfig({ ...base, templateKey: template.key }), "corruption");
    if (puzzle.solution.grid.length) puzzle.solution.grid[0]![0] = 99;
    else if (puzzle.solution.values.length) puzzle.solution.values[0] = 999;
    else puzzle.solution.text[0] = "WRONG";
    expect(validateTemplate(puzzle)).toBe(false);
  });
}

it("validates custom crossword clues without requiring a word-search collection", () => {
  const input = { ...base, theme: "My own theme", templateKey: "crossword" as const, clueList: everydayClues.map(e => `${e.word} | ${e.clue}`).join("\n") };
  expect(resolveGenerationConfig(input).crosswordClues).toEqual(everydayClues);
  expect(() => resolveGenerationConfig({ ...input, clueList: "APPLE | Fruit" })).toThrow("12-60");
  expect(() => resolveGenerationConfig({ ...input, clueList: "APPLE Fruit" })).toThrow("ANSWER | clue");
  expect(generationInputSchema.safeParse({ ...base, templateKey: "not-a-template" }).success).toBe(false);
});
it("rejects contradictory Sudoku clues and ambiguous logic clues", () => {
  expect(solveSudoku([[1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])).toEqual([]);
  expect(solveLogic([]).length).toBe(576);
  expect(Number.isNaN(arithmetic("1 + 2; alert(1)"))).toBe(true);
});

it("color code arithmetic matches its printed key without exposing the white background", () => {
  for (const difficulty of ["easy", "medium", "hard"] as const) {
    const config = resolveGenerationConfig({ ...base, templateKey: "color-by-code", difficulty });
    const puzzle = generateTemplate("color-by-code", config, `color-key:${difficulty}`);
    if (puzzle.data.kind !== "color-by-code") throw new Error("Wrong template");
    const data = puzzle.data;
    expect(new Set(data.palette.map(color => color.value)).size).toBe(5);
    data.expressions.forEach((expression, i) => expect(arithmetic(expression)).toBe(data.palette[puzzle.solution.values[i]!]!.value));
    const background = data.expressions.filter((_, i) => puzzle.solution.values[i] === 0);
    expect(new Set(background).size).toBeGreaterThan(1);
    expect(background).not.toContain("0 + 0");
    const scene = templateScene(config, 2, "ACTIVITY", puzzle);
    for (const color of data.palette) expect(scene.some(op => op.kind === "text" && op.text === `${color.value} = ${color.name}`)).toBe(true);
    data.palette[0]!.value = data.palette[1]!.value;
    expect(validateTemplate(puzzle)).toBe(false);
  }
});

it("still validates and prints saved color puzzles with the original zero-based key", () => {
  const config = resolveGenerationConfig({ ...base, templateKey: "color-by-code" });
  const puzzle = generateTemplate("color-by-code", config, "legacy-colors");
  if (puzzle.data.kind !== "color-by-code") throw new Error("Wrong template");
  puzzle.data.palette.forEach(color => { delete color.value; });
  puzzle.data.expressions = puzzle.solution.values.map(value => `${value} + 0`);
  expect(validateTemplate(puzzle)).toBe(true);
  expect(templateScene(config, 2, "ACTIVITY", puzzle).some(op => op.kind === "text" && op.text === "0 = White")).toBe(true);
});

it("wraps long unbroken titles into readable lines inside the title page", () => {
  const scene = templateScene({ ...base, title: "W".repeat(120), theme: "W".repeat(80), templateKey: "crossword" }, 1, "FRONT_MATTER");
  const title = scene.filter(op => op.kind === "text" && /^W+$/.test(op.text) && op.bold);
  expect(title).toHaveLength(5);
  for (const op of title) {
    if (op.kind !== "text") throw new Error("Expected text");
    expect(op.text.length).toBeLessThanOrEqual(25);
    expect(op.y).toBeGreaterThan(170);
    expect(op.y).toBeLessThan(460);
  }
});
