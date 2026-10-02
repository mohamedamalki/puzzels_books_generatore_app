import { answerInstruction, answerOutline } from "../../modules/puzzles/word-search/answer-outline";
import { layoutBookTitle } from "../../modules/books/title-layout";
import type { WordSearchData, WordSearchSolution } from "../../modules/puzzles/word-search/engine";

export interface PngPage {
  pageNumber: number;
  role: string;
  title: string;
  puzzle: { data: WordSearchData; solution: WordSearchSolution } | null;
}

/** Render at 2550 × 3300 pixels (US Letter at 300 pixels per inch). */
export async function renderPagePng(page: PngPage, book: { title: string; requestedActivityPages: number }, config: { theme: string; difficulty: string }): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 2550; canvas.height = 3300;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not create the page image.");
  ctx.scale(2550 / 612, 3300 / 792);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 612, 792);
  const text = (value: string, x: number, y: number, size: number, bold = false, centered = false, maxWidth = 504) => {
    ctx.fillStyle = "#1f2621";
    ctx.font = `${bold ? "bold " : ""}${size}px Arial`;
    ctx.textAlign = centered ? "center" : "left";
    ctx.fillText(value, x, y, maxWidth);
  };
  if (page.role === "FRONT_MATTER") {
    ctx.strokeStyle = "#b3c2ad"; ctx.strokeRect(54, 72, 504, 640);
    text("LARGE PRINT WORD SEARCH", 306, 142, 12, true, true);
    const title = layoutBookTitle(book.title, (value, size) => {
      ctx.font = `${size}px Arial`;
      return ctx.measureText(value).width;
    });
    title.lines.forEach((value, i) => text(value, 306, 247 + i * 43, title.size, false, true, 464));
    text(`${book.requestedActivityPages} puzzles + complete answer keys`, 306, 552, 16, false, true);
    text(`${config.difficulty.toUpperCase()} / 15 x 15 GRIDS`, 306, 584, 11, false, true);
    text("Find a quiet moment. Discover a few new words.", 306, 642, 14, false, true);
  } else {
    if (!page.puzzle) throw new Error("This page is not ready to download yet.");
    text(page.title, 54, 67, 24);
    text(config.theme, 54, 94, 14);
    text(page.role === "ANSWER" ? answerInstruction : "Find and circle the words listed below.", 54, 117, 11);
    if (page.role === "ANSWER") {
      ctx.save(); ctx.translate(111, 149); ctx.scale(26, 26);
      ctx.strokeStyle = "#476240"; ctx.lineWidth = .045;
      for (const placement of page.puzzle.solution.placements) ctx.stroke(new Path2D(answerOutline(placement)));
      ctx.restore();
    }
    page.puzzle.data.grid.forEach((row, r) => row.forEach((letter, c) => {
      const x = 111 + c * 26, y = 149 + r * 26;
      text(letter, x + 13, y + 19, 16, true, true);
    }));
    ctx.strokeStyle = "#99a699"; ctx.strokeRect(107, 145, 398, 398);
    page.puzzle.data.words.forEach((word, i) => text(word, 54 + (i % 2) * 260, (page.puzzle!.data.words.length > 12 ? 562 : 575) + Math.floor(i / 2) * (page.puzzle!.data.words.length > 12 ? 18 : 25), 16, true, false, 244));
  }
  ctx.strokeStyle = "#c7ccc7"; ctx.beginPath(); ctx.moveTo(54, 741); ctx.lineTo(558, 741); ctx.stroke();
  text(String(page.pageNumber), 306, 756, 9, false, true);
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    // Release the large pixel buffer before rendering the next page in a ZIP.
    canvas.width = 0; canvas.height = 0;
    if (blob) resolve(blob); else reject(new Error("Could not create the PNG. Please try again."));
  }, "image/png"));
}
