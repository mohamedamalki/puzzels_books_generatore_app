import { z } from "zod";
import { currentUserId } from "../../../../../modules/auth/session";
import { sameOrigin } from "../../../../../modules/auth/security";
import { getDb } from "../../../../../lib/db";
import { assertTransition } from "../../../../../modules/books/workflow";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Sign in first." }, { status: 401 });
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) return Response.json({ error: "Invalid ID." }, { status: 400 });
  try {
    await getDb().$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Book" WHERE "id" = ${id.data}::uuid AND "userId" = ${userId}::uuid FOR UPDATE`;
      const book = await tx.book.findFirstOrThrow({ where: { id: id.data, userId } });
      if (book.status === "READY" || book.status === "EXPORTED") return;
      const revision = await tx.bookRevision.findUniqueOrThrow({ where: { bookId_number: { bookId: book.id, number: book.currentRevision } }, include: { validationRuns: { orderBy: { startedAt: "desc" }, take: 1 }, uniquenessReports: { orderBy: { createdAt: "desc" }, take: 1 } } });
      assertTransition(book.status, "READY", { revisionId: revision.id, sealed: !!revision.sealedAt, validatedRevisionId: revision.validationRuns[0]?.status === "PASSED" ? revision.id : undefined, uniquenessPassedRevisionId: revision.uniquenessReports[0]?.passed ? revision.id : undefined, approvedRevisionId: revision.id, approvedBy: userId });
      await tx.bookApproval.create({ data: { userId, revisionId: revision.id, approvedById: userId } });
      await tx.export.updateMany({ where: { userId, revisionId: revision.id }, data: { isReviewCopy: false } });
      await tx.book.update({ where: { id: book.id }, data: { status: "READY" } });
    });
    return Response.json({ success: true });
  } catch { return Response.json({ error: "Only your current validated book can be approved." }, { status: 409 }); }
}
