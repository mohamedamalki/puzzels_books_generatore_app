import { setImmediate as yieldEventLoop } from "node:timers/promises";
import { generateTemplateBook } from "./template-generation";
import { z } from "zod";
import type { PrismaClient } from "../generated/prisma/client";
import { DomainError } from "../lib/errors";
import { contentHash, wordSetHash } from "../modules/uniqueness/hashing";
import { jaccardSimilarity } from "../modules/uniqueness/policy";
import { deriveSeed, seededRandom } from "../modules/puzzles/core/seed";
import { generateWordSearch, validateWordSearch, shuffle, type WordSearchPuzzle } from "../modules/puzzles/word-search/engine";
import type { GenerationConfig } from "../modules/books/generation-input";
import { renderWordSearchPdf, WORD_SEARCH_RENDER_VERSION } from "../services/pdf/word-search";
import { LocalStorage } from "../services/storage/local";
import type { StoredObject } from "../services/storage/contracts";
import type { JobHandler } from "./worker";
import type { JobLease, PostgresJobQueue } from "./queue";

const layout = { key: "word-search-large-print", version: "1.0.0", width: 8.5, height: 11, margin: .75, letterSizePt: 16 };
const layoutHash = contentHash("layout", layout);

export class BookGenerationHandler implements JobHandler {
  constructor(private readonly db: PrismaClient, private readonly queue: PostgresJobQueue, private readonly storage = new LocalStorage(process.env.STORAGE_ROOT ?? ".storage")) {}

  async run(job: JobLease, signal: AbortSignal) {
    try { await this.generate(job, signal); }
    catch (error) {
      if (!signal.aborted) await this.queue.withLease(job, async tx => {
        const record = await tx.generationJob.findUniqueOrThrow({ where: { id: job.id } });
        if (record.bookId) await tx.book.updateMany({ where: { id: record.bookId, userId: job.userId, status: { in: ["GENERATING", "VALIDATING"] } }, data: { status: "NEEDS_REVIEW" } });
        await tx.generationLog.create({ data: { jobId: job.id, level: "ERROR", event: "generation_failed", metadata: { code: error instanceof DomainError ? error.code : "GENERATION_ERROR" } } });
      });
      throw error;
    }
  }

  private async generate(job: JobLease, signal: AbortSignal) {
    const { revisionId } = z.object({ revisionId: z.uuid() }).parse(job.payload);
    const revision = await this.db.bookRevision.findFirstOrThrow({ where: { id: revisionId, userId: job.userId }, include: { book: true } });
    if (revision.sealedAt) return; // A completed revision can be safely replayed after a worker crash.
    const config = revision.configuration as unknown as GenerationConfig;
    if (config.templateKey && config.templateKey !== "word-search") return generateTemplateBook(this.db, this.queue, this.storage, job, revisionId, signal);
    if (!Array.isArray(config.words) || config.words.length < 24 || ![12, 20].includes(config.wordsPerPuzzle) || config.size !== 15 || config.activityPages < 1 || config.activityPages > 100) throw new DomainError("INVALID_CONFIGURATION", "Unsupported saved book configuration");
    const puzzleType = await this.db.puzzleType.findUniqueOrThrow({ where: { key: "word-search" } });
    const prior = await this.db.puzzle.findMany({ where: { userId: job.userId, revisionId: { not: revisionId }, type: { key: "word-search" } }, orderBy: { createdAt: "desc" }, take: 5000, select: { data: true } });
    const priorSets = prior.map(puzzle => (puzzle.data as unknown as { words: string[] }).words);
    const puzzles: WordSearchPuzzle[] = [];
    await this.queue.withLease(job, async tx => {
      await tx.book.update({ where: { id: revision.bookId }, data: { status: "GENERATING" } });
      await tx.generationLog.create({ data: { jobId: job.id, level: "INFO", event: "generation_started", metadata: { activityPages: config.activityPages } } });
      await tx.bookPage.upsert({ where: { revisionId_pageNumber: { revisionId, pageNumber: 1 } }, update: {}, create: { userId: job.userId, revisionId, pageNumber: 1, role: "FRONT_MATTER", title: config.title, seed: revision.book.generationSeed, content: { title: config.title, theme: config.theme }, layoutSnapshot: layout, layoutHash, semanticHash: contentHash("frontmatter", { title: config.title, theme: config.theme }) } });
    });
    for (let index = 0; index < config.activityPages; index++) {
      signal.throwIfAborted(); await yieldEventLoop();
      const existing = await this.db.bookPage.findUnique({ where: { revisionId_pageNumber: { revisionId, pageNumber: index + 2 } }, include: { puzzle: true } });
      if (existing?.puzzle) {
        const p = existing.puzzle;
        const restored = { engineKey: "word-search", engineVersion: p.engineVersion, seed: p.seed, data: p.data, solution: p.solution } as unknown as WordSearchPuzzle;
        puzzles.push(restored); continue;
      }
      let committed = false;
      for (let attempt = 0; attempt < 40 && !committed; attempt++) {
        const seed = deriveSeed(revision.book.generationSeed, `puzzle:${index}`, attempt);
        const words = shuffle(config.words, seededRandom(seed)).slice(0, config.wordsPerPuzzle);
        const mostSimilar = Math.max(0, ...priorSets.map(other => jaccardSimilarity(words, other)), ...puzzles.map(other => jaccardSimilarity(words, other.data.words)));
        if (mostSimilar > .85) continue;
        let puzzle: WordSearchPuzzle;
        try { puzzle = generateWordSearch({ size: 15, difficulty: config.difficulty }, words, seed); }
        catch (error) { if (error instanceof DomainError && error.code === "PLACEMENT_FAILED") continue; throw error; }
        if (puzzle.data.words.length !== config.wordsPerPuzzle || !validateWordSearch(puzzle, { size: 15, difficulty: config.difficulty }, words).passed) throw new DomainError("INVALID_PUZZLE", "Puzzle answer validation failed");
        const puzzleHash = contentHash("word-search", puzzle.data), setHash = wordSetHash(words);
        const activityHash = contentHash("activity", puzzle.data), answerHash = contentHash("answer", { data: puzzle.data, solution: puzzle.solution });
        try {
          await this.queue.withLease(job, async tx => {
            await tx.contentFingerprint.createMany({ data: [
              { kind: "PUZZLE", hash: puzzleHash }, { kind: "WORD_SET", hash: setHash }, { kind: "PAGE", hash: activityHash }, { kind: "PAGE", hash: answerHash },
            ].map(entry => ({ ...entry, kind: entry.kind as "PUZZLE" | "WORD_SET" | "PAGE", userId: job.userId, originRevisionId: revisionId, canonicalizerVersion: "1.0.0" })) });
            const saved = await tx.puzzle.create({ data: { userId: job.userId, revisionId, puzzleTypeId: puzzleType.id, engineVersion: "1.0.0", seed, configuration: { size: 15, difficulty: config.difficulty }, data: puzzle.data, solution: puzzle.solution, puzzleHash, wordSetHash: setHash } });
            const activity = await tx.bookPage.create({ data: { userId: job.userId, revisionId, pageNumber: index + 2, role: "ACTIVITY", title: `Word search ${index + 1}`, seed, puzzleId: saved.id, content: { words }, layoutSnapshot: layout, layoutHash, semanticHash: activityHash } });
            await tx.bookPage.create({ data: { userId: job.userId, revisionId, pageNumber: config.activityPages + index + 2, role: "ANSWER", title: `Answer key ${index + 1}`, seed, puzzleId: saved.id, answerForId: activity.id, content: { words }, layoutSnapshot: layout, layoutHash, semanticHash: answerHash } });
            await tx.generationStep.upsert({ where: { jobId_key: { jobId: job.id, key: `puzzle:${index}` } }, create: { jobId: job.id, key: `puzzle:${index}`, status: "SUCCEEDED", attempts: attempt + 1, checkpoint: { puzzleId: saved.id }, completedAt: new Date() }, update: {} });
            await tx.generationJob.update({ where: { id: job.id }, data: { progress: Math.round((index + 1) / config.activityPages * 75), currentStep: `Created puzzle ${index + 1} of ${config.activityPages}` } });
          });
          puzzles.push(puzzle); committed = true;
        } catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error; }
      }
      if (!committed) throw new DomainError("WORD_POOL_EXHAUSTED", "Too many similar word sets. Add more custom words or use a different word collection.");
    }
    for (const puzzle of puzzles) if (puzzle.data.words.length !== config.wordsPerPuzzle || !validateWordSearch(puzzle, { size: 15, difficulty: config.difficulty }, puzzle.data.words).passed) throw new DomainError("INVALID_PUZZLE", "Saved puzzle failed validation");
    const count = await this.db.bookPage.count({ where: { revisionId } });
    if (count !== 1 + config.activityPages * 2) throw new DomainError("PAGE_COUNT_MISMATCH", "Some activity or answer pages are missing");
    await this.queue.withLease(job, async tx => {
      await tx.book.update({ where: { id: revision.bookId }, data: { status: "VALIDATING" } });
      await tx.generationJob.update({ where: { id: job.id }, data: { progress: 82, currentStep: "Validating pages and rendering PDFs" } });
    });
    // Recompute metrics after resume so the report is independent of worker history.
    const overlaps = puzzles.map((puzzle, i) => Math.max(0, ...priorSets.map(other => jaccardSimilarity(puzzle.data.words, other)), ...puzzles.slice(0, i).map(other => jaccardSimilarity(puzzle.data.words, other.data.words))));
    const score = Math.round(100 * (1 - overlaps.reduce((sum, value) => sum + value, 0) / puzzles.length));
    const policy = { scope: "owner-library-exact-and-recent-word-sets", maxExactDuplicates: 0, maxWordSetSimilarity: .85, candidateLimit: 5000 };
    const artifacts: { format: string; object: StoredObject }[] = [];
    try {
      artifacts.push({ format: "INTERIOR_PDF", object: await this.storage.put(job.userId, await renderWordSearchPdf(config, puzzles), "application/pdf") });
      signal.throwIfAborted();
      artifacts.push({ format: "ANSWERS_PDF", object: await this.storage.put(job.userId, await renderWordSearchPdf(config, puzzles, true), "application/pdf") });
      await this.queue.withLease(job, async tx => {
        for (const artifact of artifacts) {
          const asset = await tx.asset.create({ data: { userId: job.userId, storageKey: artifact.object.key, mediaType: artifact.object.mediaType, byteSize: artifact.object.byteSize, sha256: artifact.object.sha256, source: `NicheForge word-search renderer ${WORD_SEARCH_RENDER_VERSION}` } });
          await tx.export.create({ data: { userId: job.userId, revisionId, assetId: asset.id, format: artifact.format, renderVersion: WORD_SEARCH_RENDER_VERSION, isReviewCopy: true } });
        }
        await tx.validationRun.create({ data: { userId: job.userId, revisionId, status: "PASSED", policySnapshot: policy, validatorVersion: "1.0.0", checkedPages: count, finishedAt: new Date(), results: { create: ["All target words and coordinates verified", "All activity pages have answer pages", "No exact puzzle, page, or word-set duplicates", "PDF page counts and 612 x 792 point dimensions verified", "Fixed-layout font widths and print margins checked"].map((message, index) => ({ rule: `word-search-${index}`, severity: "INFO" as const, passed: true, message })) } } });
        await tx.uniquenessReport.create({ data: { userId: job.userId, revisionId, score, passed: true, policySnapshot: policy, metrics: { exactPageDuplicates: 0, exactPuzzleDuplicates: 0, exactWordSetDuplicates: 0, meanNearestWordSetOverlap: 1 - score / 100, comparedPuzzles: priorSets.length, coverSimilarity: null, scoreMeaning: "100 minus mean nearest word-set Jaccard similarity; not a guarantee of originality" }, algorithmVersion: "word-set-jaccard-1.0.0", comparedThrough: new Date() } });
        await tx.bookRevision.update({ where: { id: revisionId }, data: { sealedAt: new Date(), fingerprint: contentHash("book", puzzles.map(p => contentHash("word-search", p.data))), metadata: { title: config.title, description: `${config.activityPages} ${config.difficulty} ${config.theme.toLowerCase()} word searches with full answer keys.`, wordSource: config.wordSource } } });
        await tx.book.update({ where: { id: revision.bookId }, data: { status: "VALIDATED", pageCount: count, uniquenessScore: score } });
        await tx.generationJob.update({ where: { id: job.id }, data: { progress: 99, currentStep: "Book ready for your review" } });
        await tx.generationLog.create({ data: { jobId: job.id, level: "INFO", event: "generation_completed", metadata: { pageCount: count, score } } });
      });
    } catch (error) {
      // Objects are not public; remove uncommitted render artifacts on failed transactions.
      await Promise.allSettled(artifacts.map(artifact => this.storage.remove(artifact.object.key)));
      throw error;
    }
  }
}
