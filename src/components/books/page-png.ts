import { wordSearchScene } from "../../modules/puzzles/word-search/scene";
import { renderScenePng } from "./template-png";
import type { WordSearchData, WordSearchSolution } from "../../modules/puzzles/word-search/engine";

export interface PngPage {
  pageNumber: number;
  role: string;
  title: string;
  puzzle: { data: WordSearchData; solution: WordSearchSolution } | null;
}

/** Render the same scene as the preview and PDF at US Letter, 300 dpi. */
export async function renderPagePng(page: PngPage, book: { title: string; requestedActivityPages: number }, config: { theme: string; difficulty: string }): Promise<Blob> {
  if (page.role !== "FRONT_MATTER" && !page.puzzle) throw new Error("This page is not ready to download yet.");
  return renderScenePng(wordSearchScene({ ...config, title: book.title, activityPages: book.requestedActivityPages }, page.pageNumber, page.role, page.puzzle));
}
