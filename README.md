# NicheForge Books

Puzzle-book workspace with eight reusable templates, background generation, checked answer keys, review and approval, PDF downloads, and page PNG/ZIP exports. See [puzzle templates](docs/puzzle-templates.md) for supported types and settings. Provider connections and publishing integrations remain on the roadmap.

Start with [architecture and entity relationships](docs/architecture.md), the [12-phase roadmap](docs/roadmap.md), and the [Prisma schema](prisma/schema.prisma).

## Local setup

Requirements: Node 22.14+ (22.x) or 24.x, npm, and PostgreSQL 18. The included Docker Compose service is for local development only. On Windows PowerShell use `npm.cmd` if script execution policy blocks `npm`.

```sh
npm ci
# Copy .env.example to .env (PowerShell: Copy-Item .env.example .env)
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000 for the dashboard. Choose **New book** to create an account, then save your first word-search draft. Anonymous visitors see an empty workspace preview; signed-in users see only their own database records. `GET /api/health` reports process liveness. `GET /api/jobs/:id` requires a real session. There are no demo credentials or auth bypasses. Seed registers the eight supported puzzle templates.

`npm run dev` automatically starts the configured Windows workspace PostgreSQL cluster if needed, then refreshes the template catalog before starting the app and background worker. Docker and external databases must be started separately. To refresh an already running app's catalog, run `npm run db:seed`.

### Windows local database configured in this workspace

The local PostgreSQL cluster lives in `.storage/postgres` on loopback port **55474**. Generated credentials are stored in the ignored `.env` file. After a reboot, the same command starts both the database and app:

```powershell
npm.cmd run dev
```

For a fresh checkout with PostgreSQL 18 installed, `scripts/setup-local-db.ps1` initializes this configuration and refuses to overwrite an existing `.env` or database directory. Docker Compose remains an alternative on port 5432; choose one connection in `.env`.

`APP_ORIGIN` must match the browser address (default `http://localhost:3000`); write endpoints reject requests from a different origin. Production cookies require HTTPS. Email verification, password recovery, and OAuth are not enabled yet, so this is a local development release, not the completed production authentication release.

Production must supply its own database credentials and managed secret values. Do not use the Compose default password outside local development. Storage defaults can be set through `STORAGE_ROOT`; keep it outside the public web root.

## Checks

```sh
npm run db:generate
npm run check
npm run build
```

Database integration tests require a **dedicated disposable database** and an explicit URL. They deploy committed migrations and use isolated fixture users. Never point them at production.

```powershell
$env:TEST_DATABASE_URL = 'postgresql://nicheforge:nicheforge_local@localhost:5432/nicheforge_test'
npm.cmd run test:integration
```

Create that empty database before running tests; its name must end in `_test`. The test suite requires `TEST_DATABASE_URL` and refuses to fall back to the application URL. Unit tests need neither PostgreSQL nor provider credentials.

## Foundation modules

* Versioned `BookTypePlugin` and `PuzzleEngine` contracts; no placeholder engine registered.
* Seed derivation, canonical semantic hashing, exact-duplicate constraints and measurable uniqueness policy.
* Required-rule validation and revision-specific human approval guards.
* AI provider interface, structured response validation and bounded retries with injectable usage recording.
* PostgreSQL job claiming, leases, fencing, idempotency and page checkpoint infrastructure.
* Private local storage with generated keys, checksums and explicit storage interface.

The architecture document separates working foundation code from future services and explains concurrency, security, reproducibility and deployment boundaries.

## Browser checks

`node scripts/browser-test-server.mjs` starts an isolated, migrated `nicheforge_ui_test` database and test app on port 3101. In a second terminal, set `AUTH_BROWSER_TEST=1` and run `npm run test:browser`. Windows uses installed Microsoft Edge by default; set `BROWSER_CHANNEL=chromium` with a Playwright-installed Chromium on other systems. Test accounts are stored only in the test database.

See [dashboard and authentication implementation notes](docs/phase-2.md) for current behavior and remaining work.
