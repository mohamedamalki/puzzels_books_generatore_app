# NicheForge Books — architecture decision record

Status: Phase 1 foundation. This document describes the target system and identifies what is implemented. It is not a claim that the publishing product is complete or production-ready.

## 1. System boundaries

Use a **modular monolith** with a Next.js web process and a separately deployed Node worker. PostgreSQL is the transactional source of truth and initial durable queue. Private files live outside the public directory behind a StorageService. Add S3/R2 later through the same interface. No Redis, microservices, event bus, or marketplace integration is required initially.

```text
Browser
  │ secure session cookie, JSON, cursor pagination
  ▼
Next.js route handlers / server components
  │ session → ownership → schema → application service
  ├── PostgreSQL: metadata, revisions, content, jobs, audit records
  └── enqueue transaction → return 202 and job ID
                              │
                    Independent Node worker
                              │
       content acquisition → deterministic puzzle plugins
                              │
          fingerprints → page documents → quality checks
                              │
            cover / preview / SEO / print rendering
                              │
                private storage → artifact records
                              │
                 human approval of sealed revision
```

Dependencies point inward: delivery (`app`) → application modules → domain contracts. Domain engines never import Next.js, Prisma, provider SDKs, or storage. Infrastructure implements the contracts. Route handlers do not contain generation algorithms. Workers do not call browser-facing API endpoints.

## 2. Exact stack

Installed versions are pinned in package.json and package-lock.json; use `npm ci`.

Two narrow development-tool overrides pin `@prisma/config → deepmerge-ts` to 8.0.2 and `prisma → mysql2` to 3.24.4 to address audit findings. Prisma schema generation, migration deployment, tests and builds are verified with these overrides. Revisit them when upgrading Prisma; application storage uses PostgreSQL, not MySQL.

| Concern | Decision |
| --- | --- |
| Runtime | Node 22.14+ in the 22.x line; Node 24.x also permitted |
| Web / backend | Next.js 16.3.6 App Router, React 19.3.0, TypeScript 6.0.3 strict mode |
| Database | PostgreSQL 18.3 for the initial development container |
| ORM | Prisma 7.10.0, `prisma-client` generator, `@prisma/adapter-pg` 7.10.0, pg 8.23.0 |
| Validation | Zod 4.6.5 at every untrusted boundary |
| Tests | Vitest 5.0.2; PostgreSQL integration suite; Playwright browser/render tests in Phase 2/6 |
| Auth | Opaque database sessions with hashed tokens; Argon2id passwords in Phase 2; OAuth identities in AuthAccount |
| UI, Phase 2 | Tailwind CSS 4 and checked-in shadcn/ui primitives; pin concrete versions when introduced |
| Queue | PostgreSQL jobs with `FOR UPDATE SKIP LOCKED`, renewable leases and fencing tokens |
| PDF / image, Phase 6 | Playwright Chromium worker rendering structured print documents to PDF and PNG/JPEG; bundle ZIP creation in export service |
| Storage | Local private filesystem adapter now; S3-compatible adapter later |
| AI | Provider-neutral structured-output service; explicit provider/model configuration; no default paid provider |

Next.js uses Node 20.9 or later and does not run lint during `next build`: [official installation documentation](https://nextjs.org/docs/app/getting-started/installation). We run lint separately. Prisma 7 uses a driver adapter and separate configuration: [Prisma database driver documentation](https://docs.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers). PostgreSQL explicitly documents `SKIP LOCKED` for queue-like workloads: [SELECT documentation](https://www.postgresql.org/docs/current/sql-select.html). These inform the choices; package-lock.json records the resolved releases.

## 3. Repository structure

```text
docs/                         architecture, roadmap and operational guidance
prisma/
  schema.prisma               relational model and uniqueness constraints
  migrations/                 committed SQL, including manual check constraints
  seed.ts                     idempotent capability catalog, no demo users
src/
  app/                        minimal Next shell; health and protected job read routes
  lib/                        database composition, JSON, errors, plugin registry
  modules/
    auth/                     session lookup; issuance planned for Phase 2
    books/                    configuration, plugin contract, revision status gates
    puzzles/core/             engine contract, PRNG and hierarchical seeds
    uniqueness/               canonical hashes and scored policy evaluation
    validation/               required-rule validation orchestration
  services/
    ai/                       provider contracts, schema checks, usage sink
    storage/                  private local storage adapter and storage contract
  jobs/                       database queue, worker loop and handler contract
tests/
  unit/                       pure invariants and adapter boundaries
  integration/                actual PostgreSQL migration/ownership/queue tests
```

Future modules (`niches`, `layouts`, `covers`, `previews`, `seo`, `exports`, `series`, `bundles`, and additional puzzle engines) are introduced with their working implementation rather than empty scaffolds.

## 4. Data model and relationships

`prisma/schema.prisma` is authoritative. UUIDs identify user-facing records; monotonically growing logs use bigint. All timestamp instants are UTC. Trim dimensions are inches, fonts are points, similarity is 0–1, displayed quality scores are 0–100. Seeds are strings to avoid JavaScript integer truncation. Costs use decimal with nullable estimates: unknown cost is not zero.

| Aggregate | Relations and purpose |
| --- | --- |
| User | Owns books, themes, audiences, niches, reusable content, templates, providers and jobs. Sessions and OAuth identities are separate. |
| BookType / PuzzleType | Global allowlisted catalog keys and version metadata; adding a format does not require an enum migration. Catalog entries are not executable code. |
| Theme → Subtheme | Owner-scoped hierarchy. Composite foreign keys prevent choosing a subtheme from another theme or owner. |
| Niche → NicheResearch | Research observations retain provenance, observation date, factor values, evidence and scoring version. |
| ContentItem | Shared source, language, suitability, approval, quality and usage metadata. Typed Word, Vocabulary, Question and Clue extensions; PROMPT and QUOTE use the base record. Trivia is a Question subtype. |
| ContentItem ↔ Category | ContentCategory join; ContentUsage snapshots the exact item consumed by a page. |
| Book → BookRevision | Book is the mutable project index; revision freezes configuration, templates, policy, engine/prompt versions and AI input snapshots. |
| Revision → Puzzle / BookPage | Puzzle data and solutions are separate JSON fields. Activity and answer pages link within the same revision. Pages retain semantic and layout hashes. |
| Revision → ContentFingerprint | Atomic, owner-scoped reservation of exact hashes across the library. |
| Revision → ValidationRun → ValidationResult | Rule-level reports, versions, required policy and page references. Multiple runs retain history. |
| Revision → UniquenessReport / BookApproval | Measured coverage and policy results; human approval belongs to one sealed revision. |
| Revision → CoverDesign / Export → Asset | Editable cover snapshots; immutable private artifacts with checksum and size. Previews and answer keys are export formats. |
| BookSeries → Book | Ordered books and shared branding. Theme allocation must be checked before a series job begins. |
| Bundle ↔ Book | Explicit BundleBook ordering; page count is derived from selected revisions at export, not an independently mutable counter. |
| GenerationJob → Step / Log / AIUsage | Durable execution, granular recovery, metadata-only audit and token/cost accounting. |
| AIProvider → AIModel | User configuration contains secret references, never plaintext provider credentials. |
| PromptTemplate / BookTemplate / CoverTemplate / QualityPolicy | Versioned data definitions, snapshotted into each generation revision. |

Each owner-scoped relationship includes `userId` in its foreign key. This blocks a cross-owner reference even if a service forgets a lookup. Read/write services must still scope every query to the authenticated owner; UUID secrecy is not authorization. Global capability/category catalogs contain no tenant content. RLS is a later defense-in-depth option, not implemented here.

Pagination uses `(createdAt, id)` cursors. Hot indexes cover owner/status/date, content language/approval, queued jobs by availability, lease expiry and exact hashes. Do not query all puzzle payloads for dashboard counts. Usage counters and dashboard totals may be cached, with underlying usages/jobs remaining authoritative.

### Integrity boundaries

* Database uniqueness prevents repeated page numbers, page hashes, puzzle hashes and word sets inside a revision. Composite keys enforce owner and revision consistency for answers, bundles, jobs, assets and content usage.
* The fingerprint ledger prevents concurrent cross-book exact duplicate reservations. Constraint errors become duplicate/retry results, not successful validation.
* Existing hashes may be reused only by a new revision of the **same book** after checking the origin book. Copying configuration creates a new project and new seeds, never copies published pages. The ledger's restrictive delete retains provenance; archive is the default. Future hard deletion must explicitly reconcile/tombstone fingerprints and storage.
* JSON is validated by the registered plugin's versioned Zod schema before persistence. JSON columns are for variable domain payloads, not substitutes for ownership and identity relations.
* No approved seeded users, no live provider credentials, no enabled placeholder engine.

## 5. BookType plugin architecture

`BookTypePlugin<TConfig, TContent>` supplies runtime schemas, page planning, validation, rendering, answer planning and metadata. The plugin plans structured `PageDocument` blocks rather than injecting arbitrary HTML. Templates are versioned JSON validated against an allowlisted layout schema. Text is escaped by the renderer.

`PluginRegistry` resolves an exact key/version and rejects duplicate registrations or unavailable implementations. A database row alone cannot load or execute a plugin. Retain old engine implementations while their revisions require reproducibility; migrate explicitly if retiring a version.

Mixed books are a composition plugin. Validate unique engine keys and percentages summing to 100, then deterministically allocate integer page counts by largest remainder with a stable tie-break. Dispatch each page to its configured engine; each child supplies answers and validators. This leaves the relational model independent of any one format.

## 6. PuzzleEngine contract and reproducibility

`PuzzleEngine<Config, Input, Data, Solution>` defines schemas, generation, correctness validation and canonical semantic content. Generation receives an abort signal and seed. It must not use an AI call, system clock or unseeded random source to build final grids. Word selection and word normalization are distinct from grid placement.

Persist the root seed, derived page seed, attempt number, exact engine version, validated configuration, selected content snapshots and canonicalizer version. The seed derivation uses `(bookSeed, pageKey, attempt)` and is unaffected by worker scheduling. Retry only the failed page with a new attempt seed; completed checkpoints remain unchanged. Reproducing AI text requires stored inputs/outputs and prompt versions, not a seed promise.

Phase 4 implements word search: bounded placement/backtracking; no silently dropped targets; no duplicate normalized words; permitted direction checks; all coordinates within grid; letter-by-letter answer verification; original words paired with normalized grid tokens. The MVP must explicitly declare its supported alphabets. Never silently remove accents across languages. Exhausting placement attempts is a recoverable page error.

Sudoku (including unique-solution checks), mazes and crosswords are later engine plugins. They are not represented as fake functioning engines now.

## 7. AI provider abstraction

`AIService.generate()` accepts provider, model, system prompt, task, output schema, temperature, output-token budget, signal and bounded attempts. Adapters implement `AIProvider.generate()` and return raw output plus usage. Zod validates the parsed response; invalid responses are retried at most three total attempts and then require review. Network errors go to the job retry policy; no silent provider switching or unbounded billable retries.

OpenAI, Anthropic, Gemini and an administrator-allowlisted local endpoint become separate adapters. Provider credentials are resolved only inside server/worker composition. Their actual API SDKs, models and prices are deliberately not selected in Phase 1. User-provided endpoint URLs are not fetched; future local/remote endpoint settings need SSRF controls.

The usage sink records every received attempt, including invalid JSON, with unknown token counts/cost represented as null. Before enabling adapters, add provider-specific timeouts, concurrency caps, account budgets, cancellation, rate-limit handling and cost persistence; record price snapshots instead of hardcoding prices. Persist AI outputs privately for reproducibility without logging secret prompts or raw provider exceptions.

Prompt templates are editable, versioned records with schema metadata. Never concatenate untrusted content into system instructions. Cached reusable content is keyed by owner, theme, subtheme, language, audience, difficulty, schema/prompt version and approval. Cached words can be selected again; complete puzzle pages cannot.

## 8. Durable job architecture

Job submission eventually runs in the same database transaction as draft/revision creation. Return `202 { jobId }` immediately; the browser polls owner-scoped `GET /api/jobs/:id`. Phase 1 exposes that protected read route but no generation submission route before authentication and handlers exist.

`PostgresJobQueue` implements idempotent enqueue, atomic claiming, lease renewal, lease-fenced writes, checkpoints, completion and bounded exponential retries. The worker claims through `FOR UPDATE SKIP LOCKED`, then releases the transaction before expensive computation. A new UUID lease token fences stale workers. Heartbeats extend a live lease; expired final attempts become NEEDS_REVIEW. Execution is **at least once**, never claimed to be exactly once.

Handlers must compute outside transactions, then call `withLease()` to atomically commit output, fingerprint reservations and a step checkpoint. Output uniqueness and idempotency keys make repeated attempts safe. AI/network/render operations must not run inside a database transaction. Checkpoints identify content acquisition and individual activity/answer page keys, not just an aggregate percentage. Orphaned temporary assets need periodic cleanup before production.

The worker loop supports abort propagation, heartbeats, retry routing and unknown-handler review. No generation handlers are installed yet. Page-specific retry bounds and idempotent handler persistence ship in Phase 5. On shutdown stop claiming, signal the active handler, and let unfinished work recover through its lease. Use one worker initially and increase bounded concurrency based on CPU/memory limits; Chromium rendering needs tighter limits than metadata tasks.

## 9. Uniqueness architecture

There are three distinct checks:

1. **Exact semantic identity:** canonical JSON (stable object-key order; meaningful array order) → versioned, namespaced SHA-256. Puzzle identity excludes title/layout; page identity includes semantic role and content. Word sets normalize and sort. Book fingerprint combines ordered semantic page hashes plus content/engine manifest. Layout has a separate hash. Cryptographic hashes do not detect paraphrases.
2. **Content similarity:** candidate retrieval by owner/type/theme/language and indexed fingerprints, followed by normalized token/set similarity. Compare title, subtitle, questions, word overlap, page structures and content independently. At scale add MinHash/LSH or embeddings with versioned evaluation, rather than loading millions of grids.
3. **Policy evaluation:** zero exact page, puzzle and word-set duplication; configurable content/question/title limits and minimum weighted score. Missing required metrics fail closed. Unimplemented cover similarity is null, never falsely reported as 0%. Scores are heuristics about the measured library, not guarantees of novelty, legal clearance or commercial quality.

Exact hash constraints are non-negotiable hard gates, independent of the weighted score. Word overlap is not itself a duplicate page: a finite themed vocabulary must recur. Structural similarity is diagnostic because books intentionally reuse templates. The implemented policy excludes structure/cover from the weighted semantic score and reports them separately. Reports preserve thresholds, algorithm version, metric coverage, candidate counts and comparison time. The actual candidate retrieval/reservation service is Phase 7; do not mark books unique using only the pure scoring function.

An empty comparison library can yield zero measured overlaps, provided comparisons actually ran. An absent comparator returns null and blocks any required check. Human reviewers see which comparisons were performed and against which library scope.

## 10. Validation and approval architecture

`ValidationEngine<T>` runs an explicit required-rule set. Missing validators or an empty policy cannot pass. Exceptions propagate, so a crashed validator cannot silently approve content. Rule results are structured, versioned and persisted per revision/run.

Required stages:

| Stage | Examples |
| --- | --- |
| Input | Configuration, language/alphabet, grid capacity, mix percentages, page count and typography feasibility |
| Content | Empty/duplicate targets, suitability, factual confidence and human review flags |
| Puzzle | All targets placed; directions, coordinates, correct solution and numbering |
| Library | Within-book duplicates and cross-book exact/near-overlap policies |
| Render | Actual DOM bounding boxes, text overflow, supported glyphs, printable margins and minimum font sizes |
| Artifact | Parse generated PDF; correct MediaBox/page count; valid images, cover dimensions and checksum |

Render/PDF checks need actual rendered artifacts and cannot be passed by schema checks alone. Font size, row count and trim size interact: reject or redesign a layout if large print cannot fit safely. A requested 100 **activity** pages is different from total interior pages once front matter and answers are included. Store both, calculate an exact page plan and show the final total before approval; never silently label 100 puzzles as 100 physical pages.

Workflow: DRAFT → GENERATING → VALIDATING → VALIDATED → READY → EXPORTED. NEEDS_REVIEW/FAILED capture recoverable failures; ARCHIVED preserves history. `assertTransition` requires the current sealed revision's validation and uniqueness for VALIDATED/READY/EXPORTED, plus recorded human approval for READY/EXPORTED. Services in Phase 5/7 must call this inside a transaction after reading real stored reports; browser-supplied gate booleans are never trusted. Edits fork a new revision, set DRAFT and require fresh validation and approval. Review exports are explicitly marked; commercial exports require current approval.

## 11. Security and operations

No business mutation endpoint is public in this phase. Session lookups return no user when a valid cookie is absent. Phase 2 adds credential issuance, email verification, reset flow, cookie flags (HttpOnly, Secure in production, SameSite), CSRF/origin checks, shared rate limits and Argon2id verification. Passwords/tokens and provider secrets never enter frontend bundles or logs. Authentication errors must avoid account enumeration.

Local storage uses internal UUID keys, a private root, size limits and restricted media types. It is for application-generated artifacts, not a safe-upload API. Before uploads ship, inspect file signatures, scan where appropriate, strip unsafe metadata, prohibit active SVG/HTML and validate permissions. The storage directory must be writable only by the application account and must not contain attacker-created symlinks. Never expose it using Next static files. Object-store deployment retains private access and short-lived owner-authorized download URLs.

Production also needs HTTPS, secret management, database backups and restore drills, migration review, restricted database roles, monitoring, retention/erasure policies and recovery exercises. Logs use allowlisted event metadata and safe error codes. No raw API keys, provider bodies or content are logged by these foundations. A liveness endpoint does not attest database readiness; add private dependency health monitoring at deployment.

## 12. Implemented versus planned

Implemented: normalized schema; migration baseline and integrity constraints; typed plugin/engine contracts; configuration validation; canonical hashing and seed utilities; pure similarity policy; required-rule validation engine; revision status guards; structured AI service with injectable adapters/usage sink; local storage; durable PostgreSQL queue and worker skeleton; protected job read API; tests and setup.

Not yet implemented: signup/login UI, dashboard, niche CRUD/import, real AI adapters, generation engines/handlers, fingerprint reservation application service, near-duplicate candidate retrieval, print renderers, covers, previews, SEO generation, approval endpoints, export pipeline, series/bundles UI and production deployment. The roadmap defines their acceptance gates. This intentionally honors the requested architecture-first Phase 1.
