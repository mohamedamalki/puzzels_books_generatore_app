import { expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderWordSearchPdf } from "../../src/services/pdf/word-search";
import { resolveGenerationConfig } from "../../src/modules/books/generation-input";
import { generateWordSearch } from "../../src/modules/puzzles/word-search/engine";

it("exports the exact page plan and a separate answer key at the selected trim", async () => {
  const config = resolveGenerationConfig({ title: "Garden Word Search", theme: "Gardening", audience: "Adults", activityPages: 2, difficulty: "easy" });
  const puzzles = [0, 1].map(i => generateWordSearch({ size: 15, difficulty: "easy" }, config.words.slice(i, i + config.wordsPerPuzzle), `pdf:${i}`));
  const interior = await PDFDocument.load(await renderWordSearchPdf(config, puzzles));
  expect(interior.getPageCount()).toBe(5);
  expect(interior.getPages().every(page => page.getWidth() === 612 && page.getHeight() === 792)).toBe(true);
  const answers = await PDFDocument.load(await renderWordSearchPdf(config, puzzles, true));
  expect(answers.getPageCount()).toBe(2);
  await expect(renderWordSearchPdf(config, puzzles.slice(0, 1))).rejects.toThrow("Missing puzzle pages");
});
