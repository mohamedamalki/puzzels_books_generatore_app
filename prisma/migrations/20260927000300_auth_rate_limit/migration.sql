CREATE TABLE "AuthRateLimit" (
  "key" TEXT PRIMARY KEY,
  "attempts" INTEGER NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit" ("expiresAt");
