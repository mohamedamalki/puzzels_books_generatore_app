import { type PDFFont } from "pdf-lib";
import type { GenerationConfig } from "../../modules/books/generation-input";
import type { WordSearchPuzzle } from "../../modules/puzzles/word-search/engine";
import { wordSearchScene } from "../../modules/puzzles/word-search/scene";
import { DomainError } from "../../lib/errors";
import { renderScenesPdf } from "./templates";

export const WORD_SEARCH_RENDER_VERSION = "2.0.0";

export function fitText(font: PDFFont, text: string, maxWidth: number, preferred: number, minimum: number): number {
  const size = Math.min(preferred, maxWidth / Math.max(font.widthOfTextAtSize(text, 1), 1));
  if (size < minimum) throw new DomainError("TEXT_OVERFLOW", "Text is too long for the printable layout. Please shorten the title or theme.");
  return size;
}
export async function renderWordSearchPdf(config: GenerationConfig, puzzles: WordSearchPuzzle[], answersOnly = false): Promise<Uint8Array> {
  if (puzzles.length !== config.activityPages) throw new DomainError("PAGE_COUNT_MISMATCH", "Missing puzzle pages");
  const scenes = answersOnly ? [] : [wordSearchScene(config, 1, "FRONT_MATTER", null), ...puzzles.map((puzzle, i) => wordSearchScene(config, i + 2, "ACTIVITY", puzzle))];
  scenes.push(...puzzles.map((puzzle, i) => wordSearchScene(config, config.activityPages + i + 2, "ANSWER", puzzle)));
  return renderScenesPdf(config.title, scenes);
}
