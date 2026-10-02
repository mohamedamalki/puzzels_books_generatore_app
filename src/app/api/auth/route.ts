import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "../../../lib/db";
import { credentialsSchema, sameOrigin, allowAuthAttempt } from "../../../modules/auth/security";
import { hashPassword, verifyPassword } from "../../../modules/auth/password";

const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers });
  if (!process.env.DATABASE_URL) return Response.json({ error: "Connect your database to create an account. See Settings for setup instructions." }, { status: 503, headers });
  if (Number(request.headers.get("content-length")) > 8192) return Response.json({ error: "Request too large." }, { status: 413, headers });
  const raw = await request.text();
  if (raw.length > 8192) return Response.json({ error: "Request too large." }, { status: 413, headers });
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return Response.json({ error: "Invalid request." }, { status: 400, headers }); }
  const result = credentialsSchema.safeParse(data);
  if (!result.success) return Response.json({ error: result.error.issues[0]?.message ?? "Check your details." }, { status: 400, headers });
  const input = result.data;
  try {
    if (!await allowAuthAttempt(input.email) || !await allowAuthAttempt("global-auth-budget", 100)) return Response.json({ error: "Too many attempts. Please try again in 15 minutes." }, { status: 429, headers });
    const db = getDb();
    let user = await db.user.findUnique({ where: { email: input.email } });
    if (input.mode === "register") {
      const passwordHash = await hashPassword(input.password);
      if (user) return Response.json({ error: "Unable to create this account. Try signing in." }, { status: 400, headers });
      user = await db.user.create({ data: { email: input.email, name: input.name ?? "Publisher", passwordHash } });
    } else {
      if (!user?.passwordHash) { await hashPassword(input.password); return Response.json({ error: "Email or password is incorrect." }, { status: 401, headers }); }
      if (!await verifyPassword(user.passwordHash, input.password)) return Response.json({ error: "Email or password is incorrect." }, { status: 401, headers });
    }
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 86400_000);
    await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt } });
    (await cookies()).set("nicheforge-session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
    return Response.json({ success: true }, { headers });
  } catch {
    return Response.json({ error: "Account service is unavailable. Check your database connection and try again." }, { status: 503, headers });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers });
  const jar = await cookies();
  const token = jar.get("nicheforge-session")?.value;
  if (token && process.env.DATABASE_URL) await getDb().session.deleteMany({ where: { tokenHash: createHash("sha256").update(token).digest("hex") } });
  jar.delete("nicheforge-session");
  return Response.json({ success: true }, { headers });
}
