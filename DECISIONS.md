# Architecture Decisions

Six decisions that shaped the framework. For each: what I chose, what I rejected, and what would flip it.

---

## 1. Single typed API client instead of raw fetch in tests

**Chosen:** A shared `ApiClient` class (`lib/api/client.ts`) that all tests and factories go through. It handles base URL, auth token injection, and surfaces a typed `ApiResponseError` on non-2xx responses.

**Rejected:** Calling `fetch` directly inside test files. It works but it scatters base URL, header construction, and error handling across every test. An agent writing a new test would have no guardrail stopping it from hitting a wrong endpoint or forgetting the `Authorization` header.

**What would flip it:** If the team already had an auto-generated SDK from an OpenAPI spec, the generated client would replace this. Wrapping a generated client would still be worth doing to centralise the base URL and token, but the method implementations would come for free.

---

## 2. Factories over fixtures for test data

**Chosen:** `UserFactory` and `ArticleFactory` are plain objects with async `create()` methods. They call `ApiClient` internally and return typed payloads. Tests call them explicitly and own the lifecycle of the data they create.

**Rejected:** Playwright fixtures for every resource (e.g. an `article` fixture that auto-creates and auto-deletes). Fixture-per-resource is appealing in theory but it hides data setup behind magic, makes it harder for an agent to understand what data a test depends on, and the implicit teardown creates ordering problems when one test's data is referenced in another's assertion.

**Rejected also:** Test data loaded from JSON files. Static JSON can't produce unique values per run — duplicate emails and slugs cause intermittent failures on a shared database.

**What would flip it:** A test environment that resets its database between every test run (e.g. a Docker container with a fresh SQLite file per CI job). In that world, static fixtures are safe and the teardown argument disappears.

---

## 3. Page Object Model with three-section convention

**Chosen:** One class per route (`LoginPage`, `EditorPage`, etc.) with methods grouped into navigation (`goto`), actions (`fill*`, `click*`, `submit`), and assertions (`expect*`). The convention is documented in `CLAUDE.md` so an agent generating a new page object produces a consistent structure without being prompted.

**Rejected:** Playwright's built-in component locators used inline inside test files. They're perfectly fine for small suites but they scatter selector knowledge across every spec. When the app's markup changes, you hunt through every test instead of fixing one page object.

**Rejected also:** A single monolithic `AppPage` that covers every route. It becomes a dumping ground and makes it impossible to tell at a glance which selectors belong to which page.

**What would flip it:** If the app used a component library with stable `data-testid` attributes everywhere, the selector stability argument for POM weakens. You still get reusability, but the maintenance saving is smaller.

---

## 4. CLAUDE.md as the primary agentic contract

**Chosen:** A dedicated `CLAUDE.md` file at the repo root that tells AI agents exactly where to put things, which fixtures to use, and what patterns are forbidden. This is read automatically by Claude Code at session start. The rules are reinforced by TypeScript types — if an agent tries to call the wrong thing, the compiler catches it before a test even runs.

**Rejected:** Relying on README documentation alone. Agents do read READMEs, but a `CLAUDE.md` is specifically scanned by Claude Code as agent context. Keeping agent instructions separate from human setup instructions also avoids a README that tries to serve two audiences.

**Rejected also:** Runtime guardrails only (linting, test-time assertions). Those catch mistakes after the fact. The goal was to make the wrong move structurally hard, not just detectable.

**What would flip it:** If the primary agent tool was Copilot or another tool that doesn't have a `CLAUDE.md` convention, the same content would move to a `.github/copilot-instructions.md` or equivalent. The principle stays the same; the filename changes.

---

## 5. Chromium-only, single worker, no retries

**Chosen:** The Playwright config runs one browser (Chromium), one worker, and zero retries. Tests are written to be independent and deterministic — a retry that masks a real failure is noise, not signal.

**Rejected:** Multi-browser (`chromium`, `firefox`, `webkit`) as the default. The assignment explicitly lists multi-browser support as out of scope. Even if it were in scope, cross-browser failures on a local SQLite app are almost always environmental, not meaningful product bugs.

**Rejected also:** `fullyParallel: true`. The app runs on a single SQLite file. Parallel tests that write to the same database without isolation strategies produce flaky ordering-dependent failures. Single-worker serial execution is slower but reliable. A migration to parallel execution would require either per-test database snapshots or a proper test-database provisioning layer.

**What would flip it:** A real deployed environment (not localhost SQLite) with a proper test database per worker. At that point, parallel execution is the right default and multi-browser coverage becomes feasible.

---

## 6. Playwright native tags over custom label conventions

**Chosen:** Playwright's built-in `{ tag: [...] }` option on `test.describe()` blocks, using two tag types per block — a feature tag (`@auth`, `@articles`, `@comments`, `@favourites`, `@feed`) and a layer tag (`@api`, `@ui`). Corresponding `npm run test:<tag>` scripts expose the most common filters without needing to remember the `--grep` flag.

**Rejected:** Encoding tags in test title strings (e.g. `test('[auth] registers a user', ...)`). Title-based tagging is fragile — a rename breaks the filter silently and it clutters the test output. Playwright's first-class tag support was added in v1.42 and is the idiomatic approach for our version (1.60).

**Rejected also:** A separate test registry file mapping tags to spec files. An external registry drifts out of sync with the actual tests. Tags on the `describe` block are co-located with the tests they describe, so they stay accurate.

**What would flip it:** If the team needed tags that cut across multiple features (e.g. `@smoke`, `@regression`, `@critical`) rather than just feature + layer groupings. At that point individual `test()` calls would need their own tags and a more formal tagging taxonomy (documented in CLAUDE.md) would be necessary. The infrastructure change would be minimal — just add more tag values — but the governance around who decides what's `@smoke` would need a written policy.

---

## 7. dotenv for environment configuration over hardcoded URLs

**Chosen:** `dotenv` loaded in `playwright.config.ts`. `BASE_URL` and `API_URL` are read from `.env` at runtime, falling back to `localhost` defaults. `.env.example` is committed; `.env` is git-ignored.

**Rejected:** Hardcoding `localhost:4101` and `localhost:3000` throughout the codebase. Hardcoded URLs make it impossible to point the suite at a staging environment without touching source files. An agent adding a new test would copy the hardcoded URL rather than using the config.

**Rejected also:** A custom config module (`lib/config.ts` that reads env vars). `dotenv` + Playwright's built-in `baseURL` is the standard pattern — no custom abstraction needed.

**What would flip it:** Multiple named environments (local, staging, prod) managed simultaneously. At that point a `.env.local` / `.env.staging` convention or a dedicated config package would make switching environments explicit rather than relying on overwriting a single `.env`.

---

## 8. ESLint with `@typescript-eslint` for agent-generated code safety

**Chosen:** ESLint with three targeted rules: `no-floating-promises` (catches missing `await`), `no-explicit-any` (keeps types honest), `no-unused-vars` (catches leftover imports). Run via `npm run lint`.

**Rejected:** No linting. The most common mistake in agent-generated async test code is a missing `await` on a Playwright action — the test passes silently but doesn't actually wait for the action. A lint rule catches this before the test even runs.

**Rejected also:** Prettier for formatting. Formatting is a personal preference and adds friction without improving correctness. The three ESLint rules above are correctness rules, not style rules.

**What would flip it:** A team with a shared style guide already enforced via Prettier. In that case, add Prettier alongside ESLint rather than instead of it.

---

## 9. Custom dashboard over Allure for visual reporting

**Chosen:** A 120-line Node.js script (`scripts/generate-dashboard.js`) that reads Playwright's built-in JSON reporter output (`test-results/results.json`) and produces a standalone `dashboard.html` with Chart.js charts. Run with `npm run dashboard` after `npm test`, or in one step with `npm run test:dashboard`.

**Rejected:** Allure. Allure requires a separate Java runtime, a dedicated Allure binary, and a different report format. It adds a non-trivial dependency for a gain that the Chart.js approach covers for this project's scale. Allure shines in multi-team, multi-suite environments with history tracking across hundreds of runs.

**Rejected also:** Modifying the Playwright HTML reporter itself. The built-in report is intentionally preserved — the custom dashboard is a separate file (`dashboard.html`) that complements it, not replaces it. Teams that want the full trace viewer and attachment links still open `playwright-report/index.html`.

**What the dashboard shows:**
- Four stat cards: Total, Passed, Failed, Skipped + pass rate %
- Overall doughnut chart (Passed / Failed / Skipped split)
- Per-feature stacked bar chart (@auth, @articles, @comments, @favourites, @feed, @profile)
- Full results table: status badge, test name, feature tags, layer tag, duration
- Clicking a failed row expands the error message inline
- Footer link back to the full Playwright HTML report

**What would flip it:** If the team wanted historical trend lines across multiple CI runs (pass rate over time, flake frequency by test). That requires storing results somewhere persistent — a database or a CI artifact store — and a server-side aggregation step. At that point Allure's history plugin or a proper observability tool (Grafana + InfluxDB) is the right call.

---

## Out of scope note: CI/CD

I'd add a GitHub Actions workflow with a single job: install Conduit, start it in the background, run `npm test`, upload the Playwright HTML report as an artifact. The Conduit app's `npm start` is blocking by default so the job would need a small wrapper (`npm start &` + a wait-for-port step before running tests). I kept this out of the submission because it requires knowledge of where the Conduit repo lives relative to the CI runner — an assumption I didn't want to encode without a real deployment target.
