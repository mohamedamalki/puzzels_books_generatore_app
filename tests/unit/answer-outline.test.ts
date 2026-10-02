import { expect, it } from "vitest";
import { answerOutline } from "../../src/modules/puzzles/word-search/answer-outline";
import { directionVectors } from "../../src/modules/puzzles/word-search/engine";

it("keeps adjacent answers separate, including words touching end to end", () => {
  const cabbage = answerOutline({ word: "CABBAGE", row: 0, column: 1, dr: 0, dc: 1 });
  const playful = answerOutline({ word: "PLAYFUL", row: 0, column: 8, dr: 0, dc: 1 });
  // End caps stop at 7.89 and start at 8.11, leaving a gap between the words.
  expect(cabbage).toContain("L 7.5 0.89");
  expect(playful).toContain("M 8.5 0.89");
  expect(cabbage.match(/ A /g)).toHaveLength(2);
  expect(playful.match(/ A /g)).toHaveLength(2);
});

it.each(Object.entries(directionVectors))("draws finite closed outlines for direction %s", (_name, [dr, dc]) => {
  const path = answerOutline({ word: "AUTUMN", row: 7, column: 7, dr, dc });
  expect(path).not.toMatch(/NaN|Infinity/);
  expect(path.endsWith(" Z")).toBe(true);
});
