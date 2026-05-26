# Architecture Decisions

Five decisions that shaped the framework. For each: what I chose, what I rejected, and what would flip it.

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

## Out of scope note: CI/CD

I'd add a GitHub Actions workflow with a single job: install Conduit, start it in the background, run `npm test`, upload the Playwright HTML report as an artifact. The Conduit app's `npm start` is blocking by default so the job would need a small wrapper (`npm start &` + a wait-for-port step before running tests). I kept this out of the submission because it requires knowledge of where the Conduit repo lives relative to the CI runner — an assumption I didn't want to encode without a real deployment target.
