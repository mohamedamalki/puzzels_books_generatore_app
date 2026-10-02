import { z } from "zod";
import { mathTopicKeys, mathTopics } from "../puzzles/templates/math-topics";
import { wordBanks, themeKey } from "./word-banks";
import { DomainError } from "../../lib/errors";
import { templateKeys, everydayClues, minimumTemplateWords, type TemplateKey } from "../puzzles/templates/catalog";

const printText = z.string().trim().regex(/^[\x20-\x7e]+$/, "Use English letters and standard punctuation for this print edition.");
export const generationInputSchema = z.object({
  title: printText.min(3).max(120),
  theme: printText.min(1).max(80),
  audience: z.string().trim().min(1).max(80),
  activityPages: z.number().int().min(1).max(100),
  difficulty: z.enum(["easy", "medium", "hard"]),
  wordSource: z.string().max(30).optional(),
  customWords: z.string().max(12000).optional(),
  templateKey: z.enum(templateKeys).optional(),
  mathTopic: z.enum(mathTopicKeys).optional(),
  clueList: z.string().max(8000).optional(),
  picture: z.enum(["surprise", "heart", "tree", "flower", "rocket"]).optional(),
  requestId: z.uuid().optional(),
}).strict();
export type GenerationInput = z.infer<typeof generationInputSchema>;
export type GenerationConfig = Omit<GenerationInput, "requestId" | "customWords" | "clueList"> & { words: string[]; wordsPerPuzzle: number; size: number; wordSource: string; crosswordClues?: { word: string; clue: string }[] };

export function resolveGenerationConfig(input: GenerationInput): GenerationConfig {
  const templateKey = input.templateKey ?? "word-search";
  if (templateKey === "math-maze") {
    const mathTopic = input.mathTopic ?? "addition";
    return { title: input.title, theme: mathTopics.find(topic => topic.key === mathTopic)!.label, audience: input.audience,
      difficulty: input.difficulty, activityPages: input.activityPages, templateKey, mathTopic,
      words: [], wordsPerPuzzle: 0, size: 15, wordSource: "template" };
  }
  const explicitClues = templateKey === "crossword" && !!input.clueList?.trim();
  const themed = !!input.wordSource || input.customWords !== undefined;
  if (explicitClues || (!["word-search", "secret-code"].includes(templateKey) && !themed)) {
    let crosswordClues = everydayClues;
    if (templateKey === "crossword" && input.clueList?.trim()) {
      crosswordClues = input.clueList.split(/\r?\n/).filter(line => line.trim()).map(line => {
        const parts = line.replace(/^\s*\d+[.)]\s*/, "").split("|");
        const word = parts[0]?.trim().toUpperCase().replace(/[ -]/g, "") ?? "", clue = parts[1]?.trim() ?? "";
        if (parts.length !== 2 || !/^[A-Z]{3,12}$/.test(word) || !/^[\x20-\x7e]{5,70}$/.test(clue)) throw new DomainError("INVALID_CLUE", "Use ANSWER | clue on each line: 3-12 English letters per answer, and a 5-70 character clue.");
        return { word, clue };
      });
      if (crosswordClues.length < 12 || crosswordClues.length > 60 || new Set(crosswordClues.map(c => c.word)).size !== crosswordClues.length) throw new DomainError("INVALID_CLUES", "Provide 12-60 different crossword answers with clues.");
    }
    return { title: input.title, theme: input.theme, audience: input.audience, difficulty: input.difficulty, activityPages: input.activityPages, templateKey, picture: input.picture ?? "surprise", words: explicitClues ? crosswordClues.map(entry => entry.word) : [], wordsPerPuzzle: 0, size: 15, wordSource: explicitClues ? "custom" : "template", ...(templateKey === "crossword" ? { crosswordClues } : {}) };
  }
  return resolveWordConfig(input, templateKey);
}

function resolveWordConfig(input: GenerationInput, templateKey: TemplateKey): GenerationConfig {
  const source = input.wordSource ?? themeKey(input.theme);
  const custom = source === "custom" || input.customWords !== undefined;
  const maxLength = templateKey === "crossword" ? 12 : 15;
  const minLength = templateKey === "secret-code" ? 2 : 3;
  // Decode pasted HTML spaces before splitting: their semicolons are not separators.
  const pastedWords = input.customWords?.replace(/&(?:#x0*(?:20|a0)|#0*(?:32|160)|nbsp);/gi, " ");
  const rawWords = custom ? pastedWords?.split(/[,;\n\r]+/) : wordBanks[source]?.words.filter(word => word.length <= maxLength);
  if (!rawWords) throw new DomainError("WORDS_REQUIRED", "Choose a built-in word collection or enter your own word list.");
  // Remove pasted list markers, not digits or punctuation inside actual words.
  const entries = rawWords.map(word => word.trim().replace(/^(?:\d+[.)]|\(\d+\)|[-*\u2022]\s+)\s*/, "").trim()).filter(Boolean);
  const normalized = entries.map(word => word.toUpperCase().replace(/[ -]/g, ""));
  const invalid = normalized.findIndex(word => !/^[A-Z]+$/.test(word) || word.length < minLength || word.length > maxLength);
  if (invalid !== -1) throw new DomainError("INVALID_WORDS", `Invalid word: "${entries[invalid]!.slice(0, 60)}". Each word must contain ${minLength} to ${maxLength} English letters. Spaces and hyphens are removed in the grid.`);
  const words = [...new Set(normalized)];
  if (words.length < minimumTemplateWords[templateKey]) throw new DomainError("MORE_WORDS_REQUIRED", `Please provide at least ${minimumTemplateWords[templateKey]} different words for this template.`);
  if (words.length > 600) throw new DomainError("TOO_MANY_WORDS", "Use at most 600 different words.");
  return { title: input.title, theme: input.theme, audience: input.audience, activityPages: input.activityPages, difficulty: input.difficulty, templateKey, wordSource: custom ? "custom" : source, words, wordsPerPuzzle: templateKey === "word-search" ? 20 : 0, size: 15, ...(templateKey === "color-by-code" ? { picture: input.picture ?? "surprise" } : {}) };
}
