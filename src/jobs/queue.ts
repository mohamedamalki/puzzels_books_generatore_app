import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PrismaClient, Prisma } from "../generated/prisma/client";
import { DomainError } from "../lib/errors";
import { contentHash } from "../modules/uniqueness/hashing";
import type { Json } from "../lib/json";

export const jobInputSchema = z.object({
  userId: z.uuid(),
  bookId: z.uuid().optional(),
  type: z.enum(["BOOK_GENERATION", "PAGE_REGENERATION", "SERIES_GENERATION", "PREVIEW_GENERATION", "COVER_GENERATION", "EXPORT", "VALIDATION"]),
  idempotencyKey: z.string().min(8).max(160),
  payload: z.json(),
  maxAttempts: z.number().int().min(1).max(10).default(3),
}).strict();
export type EnqueueInput = z.input<typeof jobInputSchema>;
export interface JobLease {
  id: string;
  userId: string;
  type: z.infer<typeof jobInputSchema>["type"];
  payload: Json;
  leaseToken: string;
  attempts: number;
  maxAttempts: number;
}

/** At-least-once PostgreSQL queue. Every completion/write is fenced by a live lease. */
export class PostgresJobQueue {
  constructor(private readonly db: PrismaClient, private readonly leaseSeconds = 60) {
    if (!Number.isInteger(leaseSeconds) || leaseSeconds < 10 || leaseSeconds > 3600) throw new Error("Invalid lease duration");
  }

  async enqueue(raw: EnqueueInput) {
    const input = jobInputSchema.parse(raw);
    const job = await this.db.generationJob.upsert({
      where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey: input.idempotencyKey } },
      create: { ...input, payload: input.payload === null ? {} : input.payload },
      update: {},
    });
    if (job.type !== input.type || job.bookId !== (input.bookId ?? null) || contentHash("job", job.payload as Json) !== contentHash("job", input.payload === null ? {} : input.payload)) {
      throw new DomainError("IDEMPOTENCY_CONFLICT", "Idempotency key was used with different input");
    }
    return job;
  }

  async claim(): Promise<JobLease | null> {
    const token = randomUUID();
    // Expired final attempts must become terminal instead of remaining RUNNING forever.
    await this.db.$executeRaw`
      UPDATE "GenerationJob" SET "status" = 'NEEDS_REVIEW', "finishedAt" = NOW(),
        "leaseToken" = NULL, "leaseExpiresAt" = NULL, "errorCode" = 'LEASE_EXHAUSTED', "updatedAt" = NOW()
      WHERE "status" = 'RUNNING' AND "leaseExpiresAt" < NOW() AND "attempts" >= "maxAttempts"`;
    const jobs = await this.db.$queryRaw<JobLease[]>`
      WITH candidate AS (
        SELECT "id" FROM "GenerationJob"
        WHERE (("status" IN ('QUEUED', 'RETRY_WAIT') AND "availableAt" <= NOW())
          OR ("status" = 'RUNNING' AND "leaseExpiresAt" < NOW()))
          AND "attempts" < "maxAttempts"
        ORDER BY "availableAt", "createdAt", "id"
        FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE "GenerationJob" j SET "status" = 'RUNNING', "leaseToken" = ${token}::uuid,
        "leaseExpiresAt" = NOW() + make_interval(secs => ${this.leaseSeconds}),
        "attempts" = j."attempts" + 1, "startedAt" = COALESCE(j."startedAt", NOW()), "updatedAt" = NOW()
      FROM candidate WHERE j."id" = candidate."id"
      RETURNING j."id", j."userId", j."type", j."payload", j."leaseToken", j."attempts", j."maxAttempts"`;
    return jobs[0] ?? null;
  }

  async heartbeat(lease: JobLease): Promise<void> {
    const count = await this.db.$executeRaw`
      UPDATE "GenerationJob" SET "leaseExpiresAt" = NOW() + make_interval(secs => ${this.leaseSeconds}), "updatedAt" = NOW()
      WHERE "id" = ${lease.id}::uuid AND "leaseToken" = ${lease.leaseToken}::uuid
        AND "status" = 'RUNNING' AND "leaseExpiresAt" > NOW()`;
    if (!count) throw new DomainError("LEASE_LOST", "Worker no longer owns the job");
  }

  /** Page writes and checkpoint must commit together within this short transaction. */
  async withLease<T>(lease: JobLease, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "GenerationJob" WHERE "id" = ${lease.id}::uuid
          AND "userId" = ${lease.userId}::uuid AND "leaseToken" = ${lease.leaseToken}::uuid
          AND "status" = 'RUNNING' AND "leaseExpiresAt" > NOW() FOR UPDATE`;
      if (!rows.length) throw new DomainError("LEASE_LOST", "Worker no longer owns the job");
      return work(tx);
    }, { timeout: 10000 });
  }

  async checkpoint(lease: JobLease, key: string, output: Prisma.InputJsonValue, progress: number): Promise<void> {
    if (!key || key.length > 160 || !Number.isInteger(progress) || progress < 0 || progress > 99) throw new Error("Invalid checkpoint");
    await this.withLease(lease, async tx => {
      await tx.generationStep.upsert({ where: { jobId_key: { jobId: lease.id, key } },
        create: { jobId: lease.id, key, status: "SUCCEEDED", checkpoint: output, attempts: 1, completedAt: new Date() },
        update: { status: "SUCCEEDED", checkpoint: output, completedAt: new Date() },
      });
      await tx.generationJob.update({ where: { id: lease.id }, data: { progress, currentStep: key } });
    });
  }

  async finish(lease: JobLease): Promise<void> {
    await this.withLease(lease, async tx => {
      await tx.generationJob.update({ where: { id: lease.id }, data: { status: "SUCCEEDED", progress: 100, finishedAt: new Date(), leaseToken: null, leaseExpiresAt: null, errorCode: null } });
    });
  }

  async fail(lease: JobLease, errorCode: string, retryable: boolean): Promise<void> {
    if (!/^[A-Z0-9_]{1,100}$/.test(errorCode)) throw new Error("Use a safe error code, not raw provider errors");
    const retry = retryable && lease.attempts < lease.maxAttempts;
    await this.withLease(lease, async tx => {
      await tx.generationJob.update({ where: { id: lease.id }, data: {
        status: retry ? "RETRY_WAIT" : "NEEDS_REVIEW", errorCode,
        availableAt: new Date(Date.now() + Math.min(300, 2 ** lease.attempts) * 1000),
        finishedAt: retry ? null : new Date(), leaseToken: null, leaseExpiresAt: null,
      } });
    });
  }
}
