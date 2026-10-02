import { renderTemplatePdf, TEMPLATE_RENDER_VERSION } from "../../../../../services/pdf/templates";
import type { TemplatePuzzle } from "../../../../../modules/puzzles/templates/types";
import { z } from "zod";
import { currentUserId } from "../../../../../modules/auth/session";
import { getDb } from "../../../../../lib/db";
import { LocalStorage } from "../../../../../services/storage/local";
import { renderWordSearchPdf, WORD_SEARCH_RENDER_VERSION } from "../../../../../services/pdf/word-search";
import type { GenerationConfig } from "../../../../../modules/books/generation-input";
import type { WordSearchPuzzle } from "../../../../../modules/puzzles/word-search/engine";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" }, userId = await currentUserId();
  if (!userId) return Response.json({ error: "Sign in first." }, { status: 401, headers });
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) return Response.json({ error: "Invalid ID." }, { status: 400, headers });
  const format = new URL(request.url).searchParams.get("format") === "answers" ? "ANSWERS_PDF" : "INTERIOR_PDF";
  const book = await getDb().book.findFirst({ where: { id: id.data, userId, status: { in: ["READY", "EXPORTED"] } } });
  if (!book) return Response.json({ error: "Review and approve the book before downloading." }, { status: 403, headers });
  const artifact = await getDb().export.findFirst({ where: { userId, format, isReviewCopy: false, revision: { bookId: book.id, number: book.currentRevision, approval: { isNot: null } } }, orderBy: { createdAt: "desc" }, include: { asset: true } });
  if (!artifact) return Response.json({ error: "PDF is not available yet." }, { status: 404, headers });
  try {
    let bytes: Uint8Array;
    if (artifact.renderVersion !== WORD_SEARCH_RENDER_VERSION && artifact.renderVersion !== TEMPLATE_RENDER_VERSION) {
      // Re-render the approved saved puzzles; never generate different puzzle content.
      const revision = await getDb().bookRevision.findFirstOrThrow({ where: { id: artifact.revisionId, userId, approval: { isNot: null } } });
      const pages = await getDb().bookPage.findMany({ where: { revisionId: revision.id, userId, role: "ACTIVITY" }, orderBy: { pageNumber: "asc" }, include: { puzzle: true } });
      const puzzles = pages.map(page => {
        if (!page.puzzle) throw new Error("Missing saved puzzle");
        return { engineKey: "word-search", engineVersion: page.puzzle.engineVersion, seed: page.puzzle.seed, data: page.puzzle.data, solution: page.puzzle.solution } as unknown as WordSearchPuzzle;
      });
      const config = revision.configuration as unknown as GenerationConfig;
      if (config.templateKey && config.templateKey !== "word-search") {
        bytes = await renderTemplatePdf(config, puzzles.map(p => ({ ...p, engineKey: config.templateKey })) as unknown as TemplatePuzzle[], format === "ANSWERS_PDF");
      } else bytes = await renderWordSearchPdf(config, puzzles, format === "ANSWERS_PDF");
    } else {
      bytes = await new LocalStorage(process.env.STORAGE_ROOT ?? ".storage").read(artifact.asset.storageKey);
    }
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${book.slug}-${format === "ANSWERS_PDF" ? "answers" : "interior"}.pdf"`, "Content-Length": String(bytes.length), "X-Content-Type-Options": "nosniff" } });
  } catch { return Response.json({ error: "The PDF could not be prepared. Please try again or contact the workspace administrator." }, { status: 503, headers }); }
}
