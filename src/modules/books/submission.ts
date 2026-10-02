import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../generated/prisma/client";
import { contentHash } from "../uniqueness/hashing";
import { DomainError } from "../../lib/errors";
import { generationInputSchema, resolveGenerationConfig, type GenerationInput } from "./generation-input";
import { TEMPLATE_ENGINE_VERSION } from "../puzzles/templates/catalog";

export async function submitBook(db: PrismaClient, userId: string, raw: GenerationInput, existingBookId?: string) {
  const input = generationInputSchema.parse(raw), config = resolveGenerationConfig(input);
  const idempotencyKey = existingBookId ? `generate:${existingBookId}` : `new:${input.requestId ?? randomUUID()}`;
  const inputHash = contentHash("book-request", config);
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
    const previous = await tx.generationJob.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } } });
    if (previous) {
      if (!existingBookId && (previous.payload as { inputHash?: string }).inputHash !== inputHash) throw new DomainError("REQUEST_CONFLICT", "This request was already submitted with different book settings.");
      return { id: previous.bookId!, jobId: previous.id };
    }
    const type = await tx.bookType.findUnique({ where: { key: config.templateKey ?? "word-search" } });
    if (!type) throw new DomainError("SETUP_REQUIRED", "This puzzle template needs setup. Restart the app with npm run dev, or run npm run db:seed, then try again.");
    if (!type.enabled) throw new DomainError("TEMPLATE_DISABLED", "This puzzle template is currently disabled. Choose another template.");
    let book;
    if (existingBookId) {
      book = await tx.book.findFirst({ where: { id: existingBookId, userId, status: "DRAFT" } });
      if (!book) throw new DomainError("BOOK_UNAVAILABLE", "This draft is missing or has already been generated.");
    } else {
      if (await tx.book.findFirst({ where: { userId, title: { equals: input.title, mode: "insensitive" }, status: { not: "ARCHIVED" } } })) throw new DomainError("DUPLICATE_TITLE", "You already have a book with this title. Choose a different title or open the existing book.");
      book = await tx.book.create({ data: { userId, title: input.title, slug: `book-${randomUUID()}`, bookTypeId: type.id, language: "en", difficulty: input.difficulty, trimWidth: 8.5, trimHeight: 11, requestedActivityPages: input.activityPages, interiorType: config.templateKey === "color-by-code" ? "COLOR" : "BLACK_WHITE", typography: "LARGE", generationSeed: randomUUID(), status: "GENERATING" } });
    }
    const manifest = { templateKey: config.templateKey ?? "word-search", templateVersion: "1.0.0", engineVersion: config.templateKey === "word-search" ? "1.0.0" : TEMPLATE_ENGINE_VERSION, canonicalizerVersion: "1.0.0", seed: book.generationSeed, wordSource: config.wordSource };
    const revision = await tx.bookRevision.upsert({ where: { bookId_number: { bookId: book.id, number: book.currentRevision } }, create: { userId, bookId: book.id, number: book.currentRevision, configuration: config, generationManifest: manifest }, update: { configuration: config, generationManifest: manifest } });
    await tx.book.update({ where: { id: book.id }, data: { title: input.title, status: "GENERATING", requestedActivityPages: input.activityPages, difficulty: input.difficulty, bookTypeId: type.id, interiorType: config.templateKey === "color-by-code" ? "COLOR" : "BLACK_WHITE" } });
    const job = await tx.generationJob.create({ data: { userId, bookId: book.id, type: "BOOK_GENERATION", idempotencyKey, payload: { revisionId: revision.id, inputHash }, currentStep: "Waiting for the generation worker" } });
    return { id: book.id, jobId: job.id };
  });
}
