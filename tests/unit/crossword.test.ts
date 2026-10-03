import { expect, it } from "vitest";
import { resolveGenerationConfig } from "../../src/modules/books/generation-input";
import { generateTemplate, validateTemplate } from "../../src/modules/puzzles/templates/engine";
import { templateScene } from "../../src/modules/puzzles/templates/scene";
import { everydayClues } from "../../src/modules/puzzles/templates/catalog";

it.each(["easy", "medium", "hard"] as const)("builds full connected crossword grids with matching custom clues (%s)", difficulty => {
  const config = resolveGenerationConfig({ title: "Nature Crosswords", theme: "Nature", audience: "Adults", activityPages: 1, difficulty, templateKey: "crossword", clueList: everydayClues.map(e => `${e.word} | ${e.clue}`).join("\n") });
  const puzzle = generateTemplate("crossword", config, `professional:${difficulty}`);
  expect(validateTemplate(puzzle, config.words)).toBe(true);
  if (puzzle.data.kind !== "crossword") throw new Error("Wrong template");
  expect(puzzle.data.entries).toHaveLength(difficulty === "easy" ? 8 : difficulty === "medium" ? 10 : 12);
  for (const entry of puzzle.data.entries) {
    expect(entry.clue).toBe(everydayClues.find(e => e.word === entry.word)?.clue);
  }
  for (const role of ["ACTIVITY", "ANSWER"]) {
    const scene = templateScene(config, role === "ANSWER" ? 3 : 2, role, puzzle);
    expect(scene.filter(op => op.kind === "text" && ["ACROSS", "DOWN"].includes(op.text))).toHaveLength(2);
    for (const entry of puzzle.data.entries) {
      const label = `${entry.number}. ${role === "ANSWER" ? entry.word : `(${entry.word.length} letters)`}`;
      const op = scene.find(op => op.kind === "text" && op.text === label);
      expect(op?.x).toBe(entry.direction === "across" ? 54 : 314);
    }
  }
});

it("keeps long clues above the footer even with an uneven direction split", () => {
  const puzzle = generateTemplate("crossword", { words: [], difficulty: "hard" }, "long-clues");
  if (puzzle.data.kind !== "crossword") throw new Error("Wrong template");
  puzzle.data.entries.forEach(entry => { entry.direction = "down"; entry.clue = "A".repeat(70); });
  const scene = templateScene({ title: "Long clues", theme: "Topic", activityPages: 1 }, 2, "ACTIVITY", puzzle);
  const clues = scene.filter(op => op.kind === "text" && op.y >= 491 && op.y < 741);
  expect(clues).toHaveLength(puzzle.data.entries.length * 3);
  expect(clues.every(op => op.y < 731)).toBe(true);
});
