import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "../../lib/db";

/** Resolve only nonexpired server-side sessions; never accept a user ID from the client. */
export async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get("nicheforge-session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await getDb().session.findUnique({ where: { tokenHash }, select: { userId: true, expiresAt: true } });
  return session && session.expiresAt > new Date() ? session.userId : null;
}
