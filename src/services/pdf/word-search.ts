import { answerInstruction, answerOutline } from "../../modules/puzzles/word-search/answer-outline";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { GenerationConfig } from "../../modules/books/generation-input";
import type { WordSearchPuzzle } from "../../modules/puzzles/word-search/engine";
import { DomainError } from "../../lib/errors";
import { layoutBookTitle } from "../../modules/books/title-layout";

export const WORD_SEARCH_RENDER_VERSION = "1.4.0";

const width = 612, height = 792, margin = 54;
const ink = rgb(.12, .15, .13), muted = rgb(.4, .44, .4);
export function fitText(font: PDFFont, text: string, maxWidth: number, preferred: number, minimum: number): number {
  const size = Math.min(preferred, maxWidth / Math.max(font.widthOfTextAtSize(text, 1), 1));
  if (size < minimum) throw new DomainError("TEXT_OVERFLOW", "Text is too long for the printable layout. Please shorten the title or theme.");
  return size;
}
function center(page: PDFPage, text: string, font: PDFFont, size: number, y: number) {
  page.drawText(text, { x: (width - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color: ink });
}
function footer(page: PDFPage, font: PDFFont, number: number) {
  page.drawLine({ start: { x: margin, y: 51 }, end: { x: width - margin, y: 51 }, thickness: .5, color: rgb(.78,.8,.78) });
  center(page, String(number), font, 9, 36);
}
export async function renderWordSearchPdf(config: GenerationConfig, puzzles: WordSearchPuzzle[], answersOnly = false): Promise<Uint8Array> {
  if (puzzles.length !== config.activityPages) throw new DomainError("PAGE_COUNT_MISMATCH", "Missing puzzle pages");
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold), serif = await pdf.embedFont(StandardFonts.TimesRoman);
  pdf.setTitle(config.title); pdf.setSubject(`${config.theme} word search`); pdf.setCreator("NicheForge Books");
  if (!answersOnly) {
    const cover = pdf.addPage([width, height]);
    cover.drawRectangle({ x: margin, y: 80, width: width - margin * 2, height: 640, borderColor: rgb(.7,.76,.68), borderWidth: 1 });
    center(cover, "LARGE PRINT WORD SEARCH", bold, 12, 650);
    const title = layoutBookTitle(config.title, (value, size) => serif.widthOfTextAtSize(value, size), width - margin * 2 - 40);
    title.lines.forEach((line, i) => center(cover, line, serif, title.size, 545 - i * 43));
    center(cover, `${puzzles.length} puzzles + complete answer keys`, regular, 16, 240);
    center(cover, `${config.difficulty.toUpperCase()}  /  15 x 15 GRIDS`, regular, 11, 208);
    center(cover, "Find a quiet moment. Discover a few new words.", serif, 14, 150);
    footer(cover, regular, 1);
  }
  for (const answers of answersOnly ? [true] : [false, true]) for (const [index, puzzle] of puzzles.entries()) {
    const page = pdf.addPage([width, height]);
    page.drawText(`${answers ? "Answer key" : "Word search"} ${String(index + 1).padStart(3, "0")}`, { x: margin, y: 725, size: 24, font: serif, color: ink });
    page.drawText(config.theme, { x: margin, y: 698, size: fitText(regular, config.theme, width - 2 * margin, 14, 10), font: regular, color: muted });
    const instruction = answers ? answerInstruction : config.difficulty === "easy" ? "Find the words across and down. Circle each word." : config.difficulty === "medium" ? "Find the words across, down, and diagonally." : "Find the words in all directions, including backwards.";
    page.drawText(instruction, { x: margin, y: 675, size: 11, font: regular, color: muted });
    const cell = 26, left = (width - 15 * cell) / 2, top = 643;
    if (answers) for (const placement of puzzle.solution.placements) {
      page.drawSvgPath(answerOutline(placement), { x: left, y: top, scale: cell, borderColor: rgb(.28, .38, .25), borderWidth: .045 });
    }
    for (let row = 0; row < 15; row++) for (let column = 0; column < 15; column++) {
      const x = left + column * cell, y = top - (row + 1) * cell;
      const letter = puzzle.data.grid[row]![column]!;
      page.drawText(letter, { x: x + (cell - bold.widthOfTextAtSize(letter, 16)) / 2, y: y + 7, size: 16, font: bold, color: ink });
    }
    page.drawRectangle({ x: left - 4, y: top - 15 * cell - 4, width: cell * 15 + 8, height: cell * 15 + 8, borderWidth: .7, borderColor: rgb(.6,.65,.6) });
    puzzle.data.words.forEach((word, i) => {
      if (bold.widthOfTextAtSize(word, 16) > 244) throw new DomainError("TEXT_OVERFLOW", "Word list exceeds printable width");
      page.drawText(word, { x: margin + (i % 2) * 260, y: (puzzle.data.words.length > 12 ? 230 : 217) - Math.floor(i / 2) * (puzzle.data.words.length > 12 ? 18 : 25), size: 16, font: bold, color: ink });
    });
    footer(page, regular, pdf.getPageCount());
  }
  const bytes = await pdf.save();
  const checked = await PDFDocument.load(bytes);
  if (checked.getPageCount() !== (answersOnly ? puzzles.length : 1 + 2 * puzzles.length) || checked.getPages().some(page => page.getWidth() !== width || page.getHeight() !== height)) throw new DomainError("INVALID_PDF", "PDF page dimensions or count do not match");
  return bytes;
}
