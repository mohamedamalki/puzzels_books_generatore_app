import { currentUserId } from "../../../modules/auth/session";
import { sameOrigin } from "../../../modules/auth/security";
import { getDb } from "../../../lib/db";
import { generationInputSchema } from "../../../modules/books/generation-input";
import { submitBook } from "../../../modules/books/submission";
import { DomainError } from "../../../lib/errors";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers });
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Sign in to create your book." }, { status: 401, headers });
  const raw = await request.text();
  if (raw.length > 18000) return Response.json({ error: "Request too large." }, { status: 413, headers });
  let input;
  try { input = generationInputSchema.parse(JSON.parse(raw)); } catch { return Response.json({ error: "Check your book details. Use an English title up to 120 characters and 1 to 100 puzzles." }, { status: 400, headers }); }
  try {
    return Response.json(await submitBook(getDb(), userId, input), { status: 202, headers });
  } catch (error) { return Response.json({ error: error instanceof DomainError ? error.message : "Could not start generation. Please try again." }, { status: error instanceof DomainError ? 409 : 503, headers }); }
}
