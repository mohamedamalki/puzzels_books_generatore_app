import { createHash } from "node:crypto";
import { z } from "zod";
import { getDb } from "../../lib/db";

export const credentialsSchema = z.object({
  mode: z.enum(["login", "register"]),
  name: z.string().trim().min(1).max(80).optional(),
  email: z.email().max(320).transform(value => value.trim().toLowerCase()),
  password: z.string().min(12, "Use at least 12 characters.").max(128),
}).strict();

export function sameOrigin(request: Request): boolean {
  const expected = process.env.APP_ORIGIN;
  if (!expected && process.env.NODE_ENV === "production") return false;
  return request.headers.get("origin") === (expected ? new URL(expected).origin : new URL(request.url).origin);
}

/** Database-backed shared limit; no proxy headers are trusted for client identity. */
export async function allowAuthAttempt(email: string, limit = 10): Promise<boolean> {
  const key = createHash("sha256").update(email).digest("hex");
  const rows = await getDb().$queryRaw<{ attempts: number }[]>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "expiresAt") VALUES (${key}, 1, NOW() + interval '15 minutes')
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthRateLimit"."expiresAt" <= NOW() THEN 1 ELSE "AuthRateLimit"."attempts" + 1 END,
      "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= NOW() THEN NOW() + interval '15 minutes' ELSE "AuthRateLimit"."expiresAt" END
    RETURNING "attempts"`;
  return (rows[0]?.attempts ?? Number.POSITIVE_INFINITY) <= limit;
}
