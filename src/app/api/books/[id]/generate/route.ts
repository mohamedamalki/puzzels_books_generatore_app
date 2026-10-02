import { z } from "zod";
import { currentUserId } from "../../../../../modules/auth/session";
import { sameOrigin } from "../../../../../modules/auth/security";
import { getDb } from "../../../../../lib/db";
import { generationInputSchema } from "../../../../../modules/books/generation-input";
import { submitBook } from "../../../../../modules/books/submission";
import { DomainError } from "../../../../../lib/errors";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Sign in first." }, { status: 401 });
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) return Response.json({ error: "Invalid ID." }, { status: 400 });
  const raw = await request.text();
  if (raw.length > 18000) return Response.json({ error: "Request too large." }, { status: 413 });
  try {
    const input = generationInputSchema.parse(JSON.parse(raw));
    return Response.json(await submitBook(getDb(), userId, input, id.data), { status: 202 });
  } catch (error) { return Response.json({ error: error instanceof DomainError ? error.message : "Check the book settings and word list." }, { status: 400 }); }
}
