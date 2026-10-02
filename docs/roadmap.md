# Implementation roadmap

Each phase delivers code, relevant migrations, owner-scoped APIs, validation and tests. UI is introduced once its backend behavior exists. No phase should fabricate successful generation, market statistics or quality checks.

| Phase | Implementation | Acceptance gate |
| --- | --- | --- |
| 1 — Foundation | Architecture, schema/migration, plugin contracts, provider abstraction, queue, hashes, policies, minimal API shell | Schema validates; migration deploys on fresh PostgreSQL; unit/integration checks; production build |
| 2 — Auth / dashboard | Email/password, secure sessions, verification/reset, OAuth-compatible identities, rate limits, origin protection, responsive Tailwind/shadcn shell, real counts and recent jobs | Cross-user access tests, login/reset/CSRF/browser tests; no invented dashboard records |
| 3 — Taxonomy / research | Themes, audiences, niches, provenance-aware research, CSV import preview, schema-checked brainstorming | Import size/formula controls; evidence labels; deterministic documented opportunity score |
| 4 — Word search | Actual deterministic placement engine, difficulty presets, word normalization, coordinates, solution extraction | 10,000 seeded grids: all targets/answers valid, no exact duplicate grids; impossible configs fail boundedly |
| 5 — Generation | Wizard, revision creation, content cache, job handlers, page checkpoints/retries, progress/history and revision-based editor | Browser request returns promptly; worker restart resumes; ownership, concurrency, idempotency and no lost pages |
| 6 — Layout / PDF | Versioned template editor, typography checks, print page documents, Chromium renderer, answer layouts, private artifact exports | Real rendered overflow/glyph/margin checks; PDF parses and trim/page count match; large-print samples visually verified |
| 7 — Uniqueness / validation | Atomic fingerprint reservations, candidate comparisons, persisted reports, regeneration policy, transactional approval service | Concurrent duplicate commits rejected; unknown comparators cannot pass; edits revoke readiness; unapproved commercial exports blocked |
| 8 — Covers | JSON templates, title/subtitle/badges/branding, front/back editor, PNG/JPG/PDF export | Correct dimensions/DPI; text fits; cover changes trigger appropriate revalidation |
| 9 — Previews | Cover, benefits, sample activity/answers/specification sequence; cached PDF/PNGs | Preview generation is asynchronous and reproducible for a revision; no full-PDF dashboard downloads |
| 10 — SEO | Versioned prompts, ten categorized title candidates, platform-specific descriptions/tags; metadata TXT/JSON and ZIP | Schema checks, human editing, no keyword stuffing or fabricated claims; all package links resolve |
| 11 — Series / bundles | Planned thematic allocations, shared branding, ordered books, selected revision snapshots and combined metadata | Duplicate theme warnings; correct combined counts; child job recovery; no cross-owner inclusions |
| 12 — Engines | Sudoku first, then maze/crossword/trivia/language/journal/activity plugins | Engine-specific property tests, suitability/factual review, exact solution checks, independent layouts |

Version 1 release is phases 1–10 focused on word search, with the mixed-format contract ready but unsupported formats disabled. Series/bundles and additional engines follow rather than delaying the initial word-search quality bar.

## Production release checklist

This is an engineering acceptance list, not an additional user approval step.

* All endpoints authenticate, authorize and validate; write routes have CSRF/origin controls and shared rate limits.
* No placeholder provider or engine is enabled; provider cost limits and private secret resolution are tested.
* Actual PostgreSQL concurrency tests cover duplicate reservations, lease reclamation and stale worker fencing.
* Puzzle soak tests, render visual checks and PDF integrity checks pass on the deployed font/browser versions.
* Worker/AI/storage failures and resume behavior are exercised; alerts identify stuck jobs and cost spikes.
* Human approval is revision-specific and commercial exports require that exact revision.
* Storage cleanup, database restore, migration rollback strategy and retained fingerprint provenance are documented and tested.

## Next concrete step

Phase 2 implements authentication and a dashboard backed by actual owner-scoped aggregates. Do not expose generation submission until the engine, handlers and quality gates exist.
