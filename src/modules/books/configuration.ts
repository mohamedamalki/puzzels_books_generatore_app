import { z } from "zod";

export const wordSearchConfigurationSchema = z.object({
  rows: z.number().int().min(8).max(30),
  columns: z.number().int().min(8).max(30),
  wordsPerPuzzle: z.number().int().min(3).max(30),
  minWordLength: z.number().int().min(2).max(30),
  maxWordLength: z.number().int().min(2).max(30),
  directions: z.array(z.enum(["E", "S", "SE", "NE", "W", "N", "NW", "SW"])).min(1).max(8),
}).strict().superRefine((value, context) => {
  if (value.minWordLength > value.maxWordLength) context.addIssue({ code: "custom", path: ["minWordLength"], message: "Minimum exceeds maximum word length" });
  const capacities = value.directions.map(direction => ["E", "W"].includes(direction) ? value.columns : ["N", "S"].includes(direction) ? value.rows : Math.min(value.rows, value.columns));
  if (value.maxWordLength > Math.max(...capacities)) context.addIssue({ code: "custom", path: ["maxWordLength"], message: "Word length cannot fit the permitted directions" });
  if (new Set(value.directions).size !== value.directions.length) context.addIssue({ code: "custom", path: ["directions"], message: "Directions must be unique" });
});

export const bookConfigurationSchema = z.object({
  bookType: z.string().regex(/^[a-z0-9-]+$/).max(80),
  pluginVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  title: z.string().trim().min(1).max(240),
  language: z.string().min(2).max(35),
  activityPages: z.number().int().min(1).max(500),
  trim: z.object({ width: z.number().min(4).max(12), height: z.number().min(4).max(14) }).strict(),
  typography: z.enum(["NORMAL", "LARGE", "EXTRA_LARGE"]),
  interior: z.enum(["BLACK_WHITE", "COLOR"]),
  seed: z.string().min(1).max(128),
}).strict();

export const puzzleMixSchema = z.array(z.object({ engineKey: z.string().regex(/^[a-z0-9-]+$/), percentage: z.number().int().min(1).max(100) }).strict()).min(1).superRefine((mix, context) => {
  if (mix.reduce((sum, part) => sum + part.percentage, 0) !== 100) context.addIssue({ code: "custom", message: "Puzzle mix must total 100%" });
  if (new Set(mix.map(part => part.engineKey)).size !== mix.length) context.addIssue({ code: "custom", message: "Each engine may appear once" });
});
