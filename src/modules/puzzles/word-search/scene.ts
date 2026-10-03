import { templateScene, type Scene } from "../templates/scene";
import { decoratePage } from "../templates/page-design";
import { answerInstruction, answerOutline } from "./answer-outline";
import type { WordSearchData, WordSearchSolution } from "./engine";

export function wordSearchScene(book: { title: string; theme: string; activityPages: number; difficulty: string }, pageNumber: number, role: string, puzzle: { data: WordSearchData; solution: WordSearchSolution } | null): Scene {
  if (role === "FRONT_MATTER") return templateScene({ ...book, templateKey: "word-search" }, pageNumber, role);
  if (!puzzle) return [];
  const scene: Scene = [];
  const text = (value: string, x: number, y: number, size: number, bold = false, center = false, width = 504) => scene.push({ kind: "text", text: value, x, y, size, bold, center, width, color: "#263448" });
  const answer = role === "ANSWER";
  const index = answer ? pageNumber - book.activityPages - 1 : pageNumber - 1;
  text(`${answer ? "Answer key" : "Word search"} ${String(index).padStart(3, "0")}`, 54, 67, 24, true);
  text(book.theme, 54, 94, 12);
  text(answer ? answerInstruction : book.difficulty === "easy" ? "Find the words across and down. Circle each word." : book.difficulty === "medium" ? "Find the words across, down, and diagonally." : "Find the words in all directions, including backwards.", 54, 117, 11);
  scene.push({ kind: "rect", x: 107, y: 145, w: 398, h: 398, fill: "none", stroke: "#a8c8bd", weight: 1 });
  if (answer) for (const placement of puzzle.solution.placements) scene.push({ kind: "path", x: 111, y: 149, path: answerOutline(placement), scale: 26, angle: 0, fill: "none", stroke: "#167568", weight: .045 });
  puzzle.data.grid.forEach((row, r) => row.forEach((letter, c) => text(letter, 124 + c * 26, 168 + r * 26, 16, true, true, 24)));
  puzzle.data.words.forEach((word, i) => text(word, 54 + i % 2 * 260, (puzzle.data.words.length > 12 ? 562 : 575) + Math.floor(i / 2) * (puzzle.data.words.length > 12 ? 18 : 25), 16, true, false, 244));
  scene.push({ kind: "line", x: 54, y: 741, x2: 558, y2: 741, weight: .5, color: "#a8c8bd" });
  text(String(pageNumber), 306, 756, 9, false, true);
  return decoratePage(scene, "word-search", role);
}
