# Dashboard and local authentication

The placeholder homepage has been replaced with a responsive publishing workspace. This is the first working slice of Phase 2, not the entire production authentication milestone.

Implemented:

* Desktop sidebar and mobile navigation, editorial-style dashboard, custom CSS book illustration, library metrics and empty states.
* Research/Ideas inspiration with search and concept details. Suggestions are editorial, not market measurements.
* Registration, sign-in and sign-out backed by PostgreSQL; Argon2id passwords, hashed random session tokens, seven-day expiry, HttpOnly/SameSite cookies, Secure cookies in production and same-origin mutation checks.
* Shared database rate limits: ten attempts per normalized email and one hundred attempts globally per fifteen-minute window. These intentionally suit a small personal deployment; replace the global cap with trustworthy ingress/IP limits before public scale. Expired counters are reused; schedule deletion of expired entries for production retention.
* Owner-scoped dashboard counts, recent books, generation jobs, validation failures and nullable AI costs.
* New-book modal that atomically creates a DRAFT and its first revision. No fake generation job or generated page count is created.
* Book search/details, account settings, connection status and explicitly marked future-module screens.

Password hashing follows [OWASP's Argon2id guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Authentication, session lookup and authorization remain separate at the server boundary, consistent with the [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication). Every draft write derives its owner from the session; it accepts no browser-supplied owner ID.

The Windows development database is private to this project, stored in `.storage/postgres` with generated credentials in `.env`. It listens only on loopback port 55474. The browser test server uses a separate `nicheforge_ui_test` database, avoiding test users in the real workspace.

Remaining before a public authentication release: email verification and password-reset delivery, OAuth, lifecycle cleanup, production ingress limits, further abuse controls and deployment/HTTPS configuration. Generation, validation reports, export, and the full editor remain separate later phases.

The existing architecture and Phase 1 verification document remain historical records of that foundation. This document supersedes their statements that the app has only a placeholder page or no session issuance.

Verified locally: 31 unit/API tests, 10 PostgreSQL integration tests, 3 browser tests, schema validation, TypeScript, ESLint and the production build. Browser tests cover desktop/mobile navigation, filtering, dialogs, account creation, draft persistence after reload, sign-out/sign-in and unauthorized/cross-origin mutation rejection. Desktop and mobile screenshots were visually inspected. The dependency installation audit reported no vulnerabilities.
