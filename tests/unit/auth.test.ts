import { describe, expect, it, vi, afterEach } from "vitest";
import { hashPassword, verifyPassword } from "../../src/modules/auth/password";
import { credentialsSchema, sameOrigin } from "../../src/modules/auth/security";

afterEach(() => vi.unstubAllEnvs());
describe("password authentication", () => {
  it("uses salted Argon2id hashes and rejects an incorrect password", async () => {
    const first = await hashPassword("a sufficiently long passphrase");
    const second = await hashPassword("a sufficiently long passphrase");
    expect(first).toMatch(/^\$argon2id\$/);
    expect(first).not.toBe(second);
    expect(await verifyPassword(first, "a sufficiently long passphrase")).toBe(true);
    expect(await verifyPassword(first, "incorrect password")).toBe(false);
    expect(await verifyPassword("invalid", "anything")).toBe(false);
  });
  it("normalizes email and enforces password length", () => {
    expect(credentialsSchema.parse({ mode: "login", email: "Person@Example.com", password: "long password value" }).email).toBe("person@example.com");
    expect(credentialsSchema.safeParse({ mode: "register", email: "person@example.com", password: "short" }).success).toBe(false);
  });
  it("rejects cross-origin and missing-origin requests", () => {
    vi.stubEnv("APP_ORIGIN", "https://books.example.com");
    expect(sameOrigin(new Request("https://books.example.com/api/auth", { headers: { origin: "https://books.example.com" } }))).toBe(true);
    expect(sameOrigin(new Request("https://books.example.com/api/auth", { headers: { origin: "https://evil.example.com" } }))).toBe(false);
    expect(sameOrigin(new Request("https://books.example.com/api/auth"))).toBe(false);
  });
});
