import { setImmediate as yieldEventLoop } from "node:timers/promises";
import type { PrismaClient } from "../generated/prisma/client";
import { DomainError } from "../lib/errors";
import { contentHash } from "../modules/uniqueness/hashing";
import { deriveSeed } from "../modules/puzzles/core/seed";
import { templateKeys, templateName } from "../modules/puzzles/templates/catalog";
import { generateTemplate, validateTemplate } from "../modules/puzzles/templates/engine";
import type { TemplatePuzzle } from "../modules/puzzles/templates/types";
import type { GenerationConfig } from "../modules/books/generation-input";
import { renderTemplatePdf, TEMPLATE_RENDER_VERSION } from "../services/pdf/templates";
import { LocalStorage } from "../services/storage/local";
import type { StoredObject } from "../services/storage/contracts";
import type { JobLease, PostgresJobQueue } from "./queue";

export async function generateTemplateBook(db: PrismaClient, queue: PostgresJobQueue, storage: LocalStorage, job: JobLease, revisionId: string, signal: AbortSignal) {
  const revision = await db.bookRevision.findFirstOrThrow({ where: { id: revisionId, userId: job.userId }, include: { book: true } });
  if (revision.sealedAt) return;
  const config = revision.configuration as unknown as GenerationConfig, key = config.templateKey;
  if (!key || key === "word-search" || !templateKeys.includes(key) || config.activityPages < 1 || config.activityPages > 100) throw new DomainError("INVALID_CONFIGURATION", "Invalid puzzle template configuration.");
  const type = await db.puzzleType.findUniqueOrThrow({ where: { key } }), name = templateName(key);
  const layout = { key, version: TEMPLATE_RENDER_VERSION, width: 8.5, height: 11 }, layoutHash = contentHash("layout", layout);
  await queue.withLease(job, async tx => {
    await tx.book.update({ where: { id: revision.bookId }, data: { status: "GENERATING" } });
    await tx.bookPage.upsert({ where: { revisionId_pageNumber: { revisionId, pageNumber: 1 } }, update: {}, create: { userId: job.userId, revisionId, pageNumber: 1, role: "FRONT_MATTER", title: config.title, seed: revision.book.generationSeed, content: { title: config.title }, layoutSnapshot: layout, layoutHash, semanticHash: contentHash("template-cover", { title: config.title, key }) } });
  });
  const puzzles: TemplatePuzzle[] = [];
  for (let index = 0; index < config.activityPages; index++) {
    signal.throwIfAborted(); await yieldEventLoop();
    const existing = await db.bookPage.findUnique({ where: { revisionId_pageNumber: { revisionId, pageNumber: index + 2 } }, include: { puzzle: true } });
    if (existing?.puzzle) {
      const p = existing.puzzle;
      const restored = { engineKey: key, engineVersion: p.engineVersion, seed: p.seed, data: p.data, solution: p.solution } as unknown as TemplatePuzzle;
      if (!validateTemplate(restored, config.words)) throw new DomainError("INVALID_PUZZLE", "Saved answer verification failed.");
      puzzles.push(restored); continue;
    }
    let saved = false;
    for (let attempt = 0; attempt < 50 && !saved; attempt++) {
      signal.throwIfAborted();
      const seed = deriveSeed(revision.book.generationSeed, `${key}:${index}`, attempt), puzzle = generateTemplate(key, config, seed);
      const hash = contentHash(key, puzzle.data), activityHash = contentHash(`${key}-activity`, puzzle.data), answerHash = contentHash(`${key}-answer`, { data: puzzle.data, solution: puzzle.solution });
      try {
        await queue.withLease(job, async tx => {
          await tx.contentFingerprint.createMany({ data: [{ kind: "PUZZLE" as const, hash }, { kind: "PAGE" as const, hash: activityHash }, { kind: "PAGE" as const, hash: answerHash }].map(entry => ({ ...entry, userId: job.userId, originRevisionId: revisionId, canonicalizerVersion: "1.0.0" })) });
          const p = await tx.puzzle.create({ data: { userId: job.userId, revisionId, puzzleTypeId: type.id, engineVersion: puzzle.engineVersion, seed, configuration: { templateKey: key, difficulty: config.difficulty }, data: puzzle.data, solution: puzzle.solution, puzzleHash: hash } });
          const activity = await tx.bookPage.create({ data: { userId: job.userId, revisionId, pageNumber: index + 2, role: "ACTIVITY", title: `${name} ${index + 1}`, seed, puzzleId: p.id, content: {}, layoutSnapshot: layout, layoutHash, semanticHash: activityHash } });
          await tx.bookPage.create({ data: { userId: job.userId, revisionId, pageNumber: config.activityPages + index + 2, role: "ANSWER", title: `Answer key ${index + 1}`, seed, puzzleId: p.id, answerForId: activity.id, content: {}, layoutSnapshot: layout, layoutHash, semanticHash: answerHash } });
          await tx.generationStep.upsert({ where: { jobId_key: { jobId: job.id, key: `puzzle:${index}` } }, update: {}, create: { jobId: job.id, key: `puzzle:${index}`, status: "SUCCEEDED", attempts: attempt + 1, checkpoint: { puzzleId: p.id }, completedAt: new Date() } });
          await tx.generationJob.update({ where: { id: job.id }, data: { progress: Math.round((index + 1) / config.activityPages * 80), currentStep: `Created puzzle ${index + 1} of ${config.activityPages}` } });
        });
        puzzles.push(puzzle); saved = true;
      } catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error; }
    }
    if (!saved) throw new DomainError("TEMPLATE_VARIATIONS_EXHAUSTED", "Could not create another distinct puzzle. Try fewer pages or different settings.");
  }
  const count = await db.bookPage.count({ where: { revisionId } });
  if (count !== config.activityPages * 2 + 1 || puzzles.some(p => !validateTemplate(p, config.words))) throw new DomainError("INVALID_PUZZLE", "Page plan or answer checks failed.");
  await queue.withLease(job, async tx => {
    await tx.book.update({ where: { id: revision.bookId }, data: { status: "VALIDATING" } });
    await tx.generationJob.update({ where: { id: job.id }, data: { progress: 85, currentStep: "Checking answers and rendering PDFs" } });
  });
  const artifacts: { format: string; object: StoredObject }[] = [];
  try {
    for (const answers of [false, true]) {
      signal.throwIfAborted(); await yieldEventLoop();
      artifacts.push({ format: answers ? "ANSWERS_PDF" : "INTERIOR_PDF", object: await storage.put(job.userId, await renderTemplatePdf(config, puzzles, answers), "application/pdf") });
    }
    await queue.withLease(job, async tx => {
      for (const artifact of artifacts) {
        const asset = await tx.asset.create({ data: { userId: job.userId, storageKey: artifact.object.key, mediaType: artifact.object.mediaType, byteSize: artifact.object.byteSize, sha256: artifact.object.sha256, source: TEMPLATE_RENDER_VERSION } });
        await tx.export.create({ data: { userId: job.userId, revisionId, assetId: asset.id, format: artifact.format, renderVersion: TEMPLATE_RENDER_VERSION, isReviewCopy: true } });
      }
      const policy = { exactDuplicatesAllowed: 0, scope: "owner-library", templateKey: key };
      const messages = ["Every activity has a matching answer page", "Puzzle rules and saved answers verified", "Exact duplicate pages blocked", "US Letter pages with numbered footers"];
      if (config.words.length) messages.push("Puzzle vocabulary checked against your word collection");
      if (key === "picture-sudoku" || key === "logic-puzzle") messages.push("Every puzzle has exactly one solution");
      await tx.validationRun.create({ data: { userId: job.userId, revisionId, status: "PASSED", policySnapshot: policy, validatorVersion: "templates-1.0.0", checkedPages: count, finishedAt: new Date(), results: { create: messages.map((message, i) => ({ rule: `template-${i}`, severity: "INFO", passed: true, message })) } } });
      await tx.uniquenessReport.create({ data: { userId: job.userId, revisionId, passed: true, score: 100, policySnapshot: policy, metrics: { exactPageDuplicates: 0, checkedPages: count, scoreMeaning: "Percentage of pages without exact matches; not a measure of conceptual originality" }, algorithmVersion: "template-exact-1.0.0", comparedThrough: new Date() } });
      await tx.bookRevision.update({ where: { id: revisionId }, data: { sealedAt: new Date(), fingerprint: contentHash("template-book", puzzles.map(p => contentHash(key, p.data))), metadata: { templateKey: key, title: config.title } } });
      await tx.book.update({ where: { id: revision.bookId }, data: { status: "VALIDATED", pageCount: count, uniquenessScore: null } });
      await tx.generationJob.update({ where: { id: job.id }, data: { progress: 99, currentStep: "Book ready for your review" } });
    });
  } catch (error) { await Promise.allSettled(artifacts.map(a => storage.remove(a.object.key))); throw error; }
}
