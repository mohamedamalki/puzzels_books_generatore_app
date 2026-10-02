import { z } from "zod";
import { currentUserId } from "../../../../../modules/auth/session";
import { sameOrigin } from "../../../../../modules/auth/security";
import { getDb } from "../../../../../lib/db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const userId = await currentUserId(), id = z.uuid().safeParse((await context.params).id);
  if (!userId) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (!id.success) return Response.json({ error: "Invalid ID." }, { status: 400 });
  const db = getDb();
  const count = await db.$transaction(async tx => {
    const jobs = await tx.generationJob.updateMany({ where: { userId, bookId: id.data, type: "BOOK_GENERATION", status: { in: ["NEEDS_REVIEW", "FAILED"] } }, data: { status: "QUEUED", attempts: 0, availableAt: new Date(), finishedAt: null, errorCode: null, currentStep: "Resuming saved pages" } });
    if (jobs.count) await tx.book.updateMany({ where: { id: id.data, userId, status: "NEEDS_REVIEW" }, data: { status: "GENERATING" } });
    return jobs.count;
  });
  return Response.json({ success: !!count }, { status: count ? 202 : 409 });
}
