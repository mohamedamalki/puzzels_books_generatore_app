import type { TemplateKey } from "./catalog";
import type { MathTopic } from "./math-topics";
export type CrosswordEntry = { word: string; clue: string; row: number; column: number; direction: "across" | "down"; number: number };
export type LogicClue = { kind: "pet" | "food" | "not-pet" | "not-food" | "pair"; a: number; b: number };
export type TemplateData =
  | { kind: "crossword"; grid: string[][]; entries: CrosswordEntry[] }
  | { kind: "math-maze"; size: number; walls: boolean[][]; expressions: string[]; words?: string[] }
  | { kind: "secret-code"; alphabet: string; encoded: number[][] }
  | { kind: "picture-sudoku"; grid: number[][]; symbols: number[]; words?: string[] }
  | { kind: "i-spy"; icons: number[]; rotations: number[]; columns: number; words?: string[] }
  | { kind: "color-by-code"; size: number; expressions: string[]; picture: string; palette: { name: string; hex: string; value?: number }[]; words?: string[] }
  | { kind: "logic-puzzle"; people: string[]; pets: string[]; foods: string[]; clues: LogicClue[]; vocabulary?: boolean };
export type TemplateSolution = { grid: number[][]; values: number[]; text: string[]; route: number[] };
export type TemplatePuzzle = { engineKey: TemplateKey; engineVersion: string; seed: string; data: TemplateData; solution: TemplateSolution };
export type TemplateSettings = { difficulty: "easy" | "medium" | "hard"; words: string[]; mathTopic?: MathTopic; crosswordClues?: { word: string; clue: string }[]; picture?: string };
