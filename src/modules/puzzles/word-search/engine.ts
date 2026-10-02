import { z } from "zod";
import { seededRandom } from "../core/seed";
import { DomainError } from "../../../lib/errors";
import type { GeneratedPuzzle, PuzzleEngine } from "../core/contracts";
import type { ValidationReport } from "../../validation/contracts";

export const directionVectors = { E: [0, 1], S: [1, 0], SE: [1, 1], NE: [-1, 1], W: [0, -1], N: [-1, 0], NW: [-1, -1], SW: [1, -1] } as const;
export const puzzleConfigSchema = z.object({ size: z.number().int().min(10).max(20), difficulty: z.enum(["easy", "medium", "hard"]) }).strict();
export type PuzzleConfig = z.infer<typeof puzzleConfigSchema>;
export const wordsSchema = z.array(z.string().regex(/^[A-Z]{3,15}$/)).min(3).max(20).refine(words => new Set(words).size === words.length, "Duplicate target words");
export type Placement = { word: string; row: number; column: number; dr: number; dc: number };
export type WordSearchData = { grid: string[][]; words: string[] };
export type WordSearchSolution = { placements: Placement[] };
export type WordSearchPuzzle = GeneratedPuzzle<WordSearchData, WordSearchSolution>;

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [output[i], output[j]] = [output[j]!, output[i]!]; }
  return output;
}
export function allowedDirections(difficulty: PuzzleConfig["difficulty"]) {
  return difficulty === "easy" ? [directionVectors.E, directionVectors.S] : difficulty === "medium" ? [directionVectors.E, directionVectors.S, directionVectors.SE, directionVectors.NE] : Object.values(directionVectors);
}

export function generateWordSearch(rawConfig: PuzzleConfig, rawWords: string[], seed: string): WordSearchPuzzle {
  const config = puzzleConfigSchema.parse(rawConfig);
  const words = wordsSchema.parse(rawWords);
  if (words.some(word => word.length > config.size)) throw new DomainError("WORD_TOO_LONG", "A word cannot fit this grid");
  const random = seededRandom(seed);
  const directions = allowedDirections(config.difficulty);
  for (let restart = 0; restart < 12; restart++) {
    const grid: string[][] = Array.from({ length: config.size }, () => Array<string>(config.size).fill(""));
    const placements: Placement[] = [];
    for (const word of shuffle(words, random).sort((a, b) => b.length - a.length)) {
      const candidates: Placement[] = [];
      for (const [dr, dc] of directions) for (let row = 0; row < config.size; row++) for (let column = 0; column < config.size; column++) {
        const endR = row + dr * (word.length - 1); const endC = column + dc * (word.length - 1);
        if (endR < 0 || endR >= config.size || endC < 0 || endC >= config.size) continue;
        if ([...word].every((letter, index) => !grid[row + dr * index]![column + dc * index] || grid[row + dr * index]![column + dc * index] === letter)) candidates.push({ word, row, column, dr, dc });
      }
      if (!candidates.length) break;
      const placement = candidates[Math.floor(random() * candidates.length)]!;
      [...word].forEach((letter, index) => { grid[placement.row + placement.dr * index]![placement.column + placement.dc * index] = letter; });
      placements.push(placement);
    }
    if (placements.length !== words.length) continue;
    for (let row = 0; row < config.size; row++) for (let column = 0; column < config.size; column++) if (!grid[row]![column]) grid[row]![column] = String.fromCharCode(65 + Math.floor(random() * 26));
    return { engineKey: "word-search", engineVersion: "1.0.0", seed, data: { grid, words: [...words].sort() }, solution: { placements } };
  }
  throw new DomainError("PLACEMENT_FAILED", "Words could not be placed after bounded retries");
}

export function validateWordSearch(puzzle: WordSearchPuzzle, config: PuzzleConfig, input: string[]): ValidationReport {
  const issues: ValidationReport["issues"][number][] = [];
  const error = (rule: string, message: string) => issues.push({ rule, message, severity: "ERROR" });
  if (puzzle.data.grid.length !== config.size || puzzle.data.grid.some(row => row.length !== config.size || row.some(letter => !/^[A-Z]$/.test(letter)))) error("grid", "Invalid grid dimensions or letters");
  const targets = new Set(input);
  if (targets.size !== input.length || input.length !== puzzle.data.words.length || new Set(puzzle.data.words).size !== input.length || puzzle.data.words.some(word => !targets.has(word))) error("words", "Target words are missing or duplicated");
  if (puzzle.solution.placements.length !== targets.size || new Set(puzzle.solution.placements.map(p => p.word)).size !== targets.size) error("answers", "Answers are missing or duplicated");
  for (const p of puzzle.solution.placements) {
    if (!targets.has(p.word) || ![p.row, p.column, p.dr, p.dc].every(Number.isInteger) || !allowedDirections(config.difficulty).some(([dr, dc]) => dr === p.dr && dc === p.dc)) { error("coordinates", "Invalid answer direction or target"); continue; }
    if (![...p.word].every((letter, i) => puzzle.data.grid[p.row + p.dr * i]?.[p.column + p.dc * i] === letter)) error("answers", "Answer does not match the final grid");
  }
  return { passed: issues.length === 0, issues, checkedRules: ["grid", "words", "answers", "coordinates"] };
}

export const wordSearchEngine: PuzzleEngine<PuzzleConfig, string[], WordSearchData, WordSearchSolution> = {
  key: "word-search", version: "1.0.0", configurationSchema: puzzleConfigSchema, inputSchema: wordsSchema,
  async generate(config, input, context) { context.signal.throwIfAborted(); return generateWordSearch(config, input, context.seed); },
  validate: validateWordSearch,
  canonicalize(puzzle) { return { grid: puzzle.data.grid, words: [...puzzle.data.words].sort() }; },
};
