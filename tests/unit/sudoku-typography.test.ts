import { expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { sudokuTypography } from "../../src/modules/puzzles/templates/sudoku-typography";
import { templateScene } from "../../src/modules/puzzles/templates/scene";
import { generateTemplate } from "../../src/modules/puzzles/templates/engine";
import { resolveGenerationConfig } from "../../src/modules/books/generation-input";

it("keeps Halloween words at a uniform readable size with cell padding", async () => {
  const words = ["CLOAK", "NIGHTMARE", "WITCH", "FRANKENSTEIN"];
  const config = resolveGenerationConfig({ title: "Halloween Sudoku", theme: "Halloween", audience: "Kids", difficulty: "easy", activityPages: 1, templateKey: "picture-sudoku", wordSource: "custom", customWords: words.join("\n") });
  const puzzle = generateTemplate("picture-sudoku", config, "typography");
  const font = await (await PDFDocument.create()).embedFont(StandardFonts.HelveticaBold);
  for (const role of ["ACTIVITY", "ANSWER"]) {
    const scene = templateScene(config, role === "ANSWER" ? 3 : 2, role, puzzle);
    const labels = scene.filter(op => op.kind === "text" && op.fitted);
    const gridLabels = labels.filter(op => op.y < 585);
    expect(gridLabels.length).toBeGreaterThan(0);
    expect(new Set(gridLabels.map(op => op.kind === "text" && op.size)).size).toBe(1);
    for (const op of labels) {
      if (op.kind !== "text") continue;
      expect(words).toContain(op.text);
      expect(op.size).toBeGreaterThanOrEqual(9.5);
      expect(font.widthOfTextAtSize(op.text, op.size)).toBeLessThanOrEqual(op.width);
    }
    expect(labels.filter(op => op.y >= 648)).toHaveLength(4);
  }
});

it("wraps unusually wide words without losing letters or shrinking below readable size", async () => {
  const words = ["W".repeat(15), "M".repeat(15), "III", "FRANKENSTEIN"];
  const layout = sudokuTypography(words, 84);
  const font = await (await PDFDocument.create()).embedFont(StandardFonts.HelveticaBold);
  expect(layout.size).toBeGreaterThanOrEqual(9.5);
  expect(layout.lines[0]!.length).toBeGreaterThan(1);
  layout.lines.forEach((lines, i) => {
    expect(lines.join("").replaceAll("-", "")).toBe(words[i]);
    lines.forEach(line => expect(font.widthOfTextAtSize(line, layout.size)).toBeLessThanOrEqual(84));
  });
});
