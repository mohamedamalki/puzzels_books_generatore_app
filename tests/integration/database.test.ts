import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PostgresJobQueue } from "../../src/jobs/queue";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required; use a dedicated disposable PostgreSQL database");
const databaseName = new URL(url).pathname.slice(1);
if (!databaseName.endsWith("_test")) throw new Error("Integration database name must end with _test");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const queue = new PostgresJobQueue(db, 10);
const owner = randomUUID();
const other = randomUUID();
const bookTypeId = randomUUID();
let revisionId: string;
let otherRevisionId: string;
let bookId: string;

beforeAll(async () => {
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  await db.user.createMany({ data: [{ id: owner, email: `${owner}@example.test` }, { id: other, email: `${other}@example.test` }] });
  await db.bookType.create({ data: { id: bookTypeId, key: `test-${bookTypeId}`, name: "Test", pluginVersion: "1.0.0", configurationSchema: {} } });
  for (const userId of [owner, other]) {
    const book = await db.book.create({ data: { userId, bookTypeId, title: "Test", slug: "test", language: "en", difficulty: "easy", trimWidth: 8.5, trimHeight: 11, requestedActivityPages: 2, interiorType: "BLACK_WHITE", typography: "LARGE", generationSeed: "fixture" } });
    const revision = await db.bookRevision.create({ data: { userId, bookId: book.id, number: 1, configuration: {}, generationManifest: {} } });
    if (userId === owner) { bookId = book.id; revisionId = revision.id; } else { otherRevisionId = revision.id; }
  }
}, 60000);

afterEach(async () => {
  await db.generationJob.deleteMany({ where: { userId: { in: [owner, other] } } });
});

afterAll(async () => {
  // Only test fixture IDs are removed. Never truncate an existing database.
  await db.contentFingerprint.deleteMany({ where: { userId: { in: [owner, other] } } });
  await db.user.deleteMany({ where: { id: { in: [owner, other] } } });
  await db.bookType.deleteMany({ where: { id: bookTypeId } });
  await db.$disconnect();
});

describe("database invariants", () => {
  it("rejects references to another owner's revision", async () => {
    await expect(db.bookPage.create({ data: { userId: owner, revisionId: otherRevisionId, pageNumber: 1, role: "ACTIVITY", title: "Bad link", seed: "s", content: {}, layoutSnapshot: {}, semanticHash: "a".repeat(64), layoutHash: "b".repeat(64) } })).rejects.toThrow();
  });

  it("rejects duplicate semantic pages despite changed layout", async () => {
    const data = { userId: owner, revisionId, pageNumber: 1, role: "ACTIVITY" as const, title: "One", seed: "s", content: {}, layoutSnapshot: {}, semanticHash: "c".repeat(64), layoutHash: "d".repeat(64) };
    await db.bookPage.create({ data });
    await expect(db.bookPage.create({ data: { ...data, pageNumber: 2, layoutHash: "e".repeat(64) } })).rejects.toThrow();
  });

  it("allows only one concurrent exact-fingerprint reservation per owner", async () => {
    const data = { userId: owner, originRevisionId: revisionId, kind: "PUZZLE" as const, canonicalizerVersion: "1.0.0", hash: "f".repeat(64) };
    const results = await Promise.allSettled([db.contentFingerprint.create({ data }), db.contentFingerprint.create({ data })]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    await expect(db.contentFingerprint.create({ data: { ...data, userId: other, originRevisionId: otherRevisionId } })).resolves.toBeDefined();
  });

  it("enforces numeric checks outside the application", async () => {
    await expect(db.book.update({ where: { id: bookId }, data: { pageCount: -1 } })).rejects.toThrow();
    await expect(db.bookApproval.create({ data: { userId: owner, revisionId, approvedById: other } })).rejects.toThrow();
  });

  it("stores timestamps as instants and rejects incomplete series membership", async () => {
    const columns = await db.$queryRaw<{ data_type: string }[]>`SELECT data_type FROM information_schema.columns WHERE table_name = 'GenerationJob' AND column_name = 'leaseExpiresAt'`;
    expect(columns[0]?.data_type).toBe("timestamp with time zone");
    const series = await db.bookSeries.create({ data: { userId: owner, title: "Series", branding: {} } });
    await expect(db.book.update({ where: { id: bookId }, data: { seriesId: series.id, seriesOrder: null } })).rejects.toThrow();
  });
});

describe("durable queue", () => {
  const input = () => ({ userId: owner, bookId, type: "VALIDATION" as const, idempotencyKey: randomUUID(), payload: { revisionId } });

  it("deduplicates enqueue and rejects idempotency-key misuse", async () => {
    const data = input();
    const first = await queue.enqueue(data);
    expect((await queue.enqueue(data)).id).toBe(first.id);
    await expect(queue.enqueue({ ...data, payload: { changed: true } })).rejects.toThrow("different input");
    await expect(queue.enqueue({ ...data, userId: other, idempotencyKey: randomUUID() })).rejects.toThrow();
  });

  it("claims each job only once with concurrent consumers", async () => {
    const job = await queue.enqueue(input());
    const results = await Promise.all([queue.claim(), queue.claim(), queue.claim()]);
    const claims = results.filter(result => result !== null);
    expect(claims).toHaveLength(1);
    expect(claims[0]?.id).toBe(job.id);
  });

  it("reclaims expired leases and fences stale checkpoint and finish writes", async () => {
    await queue.enqueue(input());
    const first = (await queue.claim())!;
    await db.generationJob.update({ where: { id: first.id }, data: { leaseExpiresAt: new Date(Date.now() - 1000) } });
    const second = (await queue.claim())!;
    expect(second.id).toBe(first.id);
    expect(second.leaseToken).not.toBe(first.leaseToken);
    await expect(queue.checkpoint(first, "page:1", { done: true }, 50)).rejects.toThrow("no longer owns");
    await expect(queue.finish(first)).rejects.toThrow("no longer owns");
    await queue.checkpoint(second, "page:1", { done: true }, 50);
    await queue.finish(second);
    expect((await db.generationJob.findUniqueOrThrow({ where: { id: second.id } })).status).toBe("SUCCEEDED");
  });

  it("moves an exhausted expired lease to human review", async () => {
    const job = await queue.enqueue({ ...input(), maxAttempts: 1 });
    await queue.claim();
    await db.generationJob.update({ where: { id: job.id }, data: { leaseExpiresAt: new Date(Date.now() - 1000) } });
    expect(await queue.claim()).toBeNull();
    expect((await db.generationJob.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("NEEDS_REVIEW");
  });

  it("schedules bounded retries without discarding completed page checkpoints", async () => {
    await queue.enqueue(input());
    const lease = (await queue.claim())!;
    await queue.checkpoint(lease, "page:1", { artifact: "saved" }, 50);
    await queue.fail(lease, "TEMPORARY_FAILURE", true);
    const job = await db.generationJob.findUniqueOrThrow({ where: { id: lease.id }, include: { steps: true } });
    expect(job.status).toBe("RETRY_WAIT");
    expect(job.steps[0]?.status).toBe("SUCCEEDED");
    expect(await queue.claim()).toBeNull();
  });
});
