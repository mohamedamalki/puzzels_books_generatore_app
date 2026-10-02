import { z } from "zod";
import { currentUserId } from "../../../../modules/auth/session";
import { getDb } from "../../../../lib/db";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" }, userId = await currentUserId();
  if (!userId) return Response.json({ error: "Sign in to view this book." }, { status: 401, headers });
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) return Response.json({ error: "Invalid book ID." }, { status: 400, headers });
  const pageNumber = z.coerce.number().int().min(1).max(201).safeParse(new URL(request.url).searchParams.get("page") ?? "1");
  if (!pageNumber.success) return Response.json({ error: "Invalid page number." }, { status: 400, headers });
  const db = getDb();
  const book = await db.book.findFirst({ where: { id: id.data, userId }, select: { id: true, title: true, status: true, pageCount: true, requestedActivityPages: true, uniquenessScore: true, currentRevision: true, jobs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, progress: true, currentStep: true, errorCode: true } } } });
  if (!book) return Response.json({ error: "Book not found." }, { status: 404, headers });
  const revision = await db.bookRevision.findUniqueOrThrow({ where: { bookId_number: { bookId: book.id, number: book.currentRevision } }, include: { approval: { select: { approvedAt: true } }, exports: { select: { id: true, format: true, isReviewCopy: true } }, validationRuns: { orderBy: { startedAt: "desc" }, take: 1, include: { results: true } }, uniquenessReports: { orderBy: { createdAt: "desc" }, take: 1, select: { metrics: true } } } });
  const page = await db.bookPage.findUnique({ where: { revisionId_pageNumber: { revisionId: revision.id, pageNumber: pageNumber.data } }, select: { pageNumber: true, role: true, title: true, content: true, puzzle: { select: { data: true, solution: true } } } });
  return Response.json({ book, configuration: revision.configuration, approved: !!revision.approval, exports: revision.exports, validation: revision.validationRuns[0] ?? null, uniqueness: revision.uniquenessReports[0]?.metrics ?? null, page }, { headers });
}
