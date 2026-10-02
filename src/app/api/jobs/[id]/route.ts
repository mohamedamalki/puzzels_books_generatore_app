import { z } from "zod";
import { currentUserId } from "../../../../modules/auth/session";
import { getDb } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401, headers });
  const parsed = z.uuid().safeParse((await context.params).id);
  if (!parsed.success) return Response.json({ error: "INVALID_ID" }, { status: 400, headers });
  const job = await getDb().generationJob.findFirst({ where: { id: parsed.data, userId }, select: {
    id: true, type: true, status: true, progress: true, currentStep: true, startedAt: true, finishedAt: true, errorCode: true,
  } });
  if (!job) return Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
  return Response.json({ data: job }, { headers });
}
