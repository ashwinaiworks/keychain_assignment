# AI Usage Log

How I actually used Claude Code (claude-sonnet-4-6) during this assignment. Specific prompts, what came back, what I corrected.

---

## Tool used

**Claude Code** — the Anthropic CLI, running inside VS Code via the Claude Code extension. Model: `claude-sonnet-4-6`.

---

## Session overview

I gave Claude the assignment PDF upfront and asked it to read and understand it before doing anything. I explicitly told it not to start implementation until I confirmed the plan — I wanted to catch gaps before any code was written, not after.

---

## What I asked for and what I got

### 1. Pre-flight check

**Prompt (paraphrased):** Read the PDF. Plan the implementation. Tell me if you have questions and check all pre-requisites via terminal.

**What Claude did:** Ran `node --version`, `npm --version`, `git --version`, `npx playwright --version`, confirmed browser installs, pinged `localhost:4101` and `localhost:3000/api`, and probed the API with `curl` to confirm registration and articles endpoints were live.

**Assessment:** Solid. I didn't have to manually verify anything. It caught early that the `example.spec.ts` file was pointing at playwright.dev and flagged it would be deleted. It also spotted that browser installations were already present and didn't try to re-run `npx playwright install`.

---

### 2. Gap caught — comments and favourites missing from the test plan

**Prompt (paraphrased):** The PDF lists user registration, auth, articles, comments, user follows, and article favourites. Does your plan cover all of these?

**What Claude initially planned:** Auth + articles + feed. Comments and favourites were not in the first version of the test list.

**Correction:** When I asked it to re-read the PDF specifically for the app feature list, it caught the gap itself and updated the plan to include comments and favourites in `articles.api.spec.ts`. Follows were explicitly de-prioritised (documented in DECISIONS.md) in favour of depth on the critical path.

**Why this matters:** This is exactly the kind of omission that's easy to miss when you're moving fast. Having a structured pre-flight review step before touching any code prevented a gap in the submission.

---

### 3. TypeScript config error

**Prompt:** Proceed with implementation.

**What Claude produced:** `tsconfig.json` with `"baseUrl": "."` and a `paths` alias for `@lib/*`.

**What was wrong:** TypeScript 5.x deprecated `baseUrl` when used without `outDir`, triggering a compiler error in the IDE. Claude caught this immediately when the IDE diagnostic came back and removed `baseUrl`/`paths` entirely, switching to relative imports throughout — which is simpler and eliminates the issue without any workaround.

**The actual error shown:**
```
Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
```

**Fix applied:** Removed `baseUrl` and `paths` from `tsconfig.json`. All imports use relative paths (`../../lib/api/client`).

---

### 4. Fixture type complexity

**Prompt:** Write the shared fixtures file.

**What Claude produced first:** The `loggedInPage` fixture type was over-engineered — it used a nested `ReturnType<typeof base['extend']>` generic that TypeScript couldn't resolve cleanly and produced a confusing `never` type in some inference paths.

**Correction:** I asked it to simplify the type declaration to be explicit. It rewrote the fixture extension to use a plain inline type: `{ page: Page; user: typeof FIXED_USER }` — readable, accurate, and no inference gymnastics.

---

### 5. Selector uncertainty — chose to verify during smoke run

**Prompt:** Write the page objects for login, register, home, editor.

**What Claude said:** "The Conduit app is a React SPA — the server-sent HTML is minimal and curl won't give me real DOM. I'm writing selectors based on the known RealWorld frontend patterns (`getByPlaceholder('Email')`, `getByRole('button', { name: 'Sign in' })`) and we'll catch any mismatches during the smoke run."

**What I confirmed:** This was the right call. Probing a React SPA's selectors without running a browser is unreliable. The smoke run is the right place to surface and fix selector issues, not a pre-implementation curl.

---

## 6. Test tagging system

**Prompt (paraphrased):** Add a tagging system so test cases can be tagged by feature name (login, articles, etc.) and individual tags can be called to run specific cases.

**What Claude planned first:** Correctly identified Playwright's native `{ tag: [...] }` option as the right approach (available since v1.42, we're on 1.60). Proposed two tag types per describe block — feature tag (`@auth`, `@articles`, etc.) and layer tag (`@api`, `@ui`) — with `npm run test:<tag>` convenience scripts.

**What Claude implemented:** Added tags to all `test.describe()` blocks across 5 spec files, updated `package.json` with 5 new tag-based scripts, verified tag filtering with `--grep @auth`, `--grep @comments`, `--grep @favourites`. All 37 tests continued to pass.

**My input:** The decision to use two tag types (feature + layer) rather than just one was mine — it gives more filtering flexibility without complicating the taxonomy.

---

## What I did not use AI for

- The content of `DECISIONS.md` — I wrote the reasoning myself. Claude drafted a structure but the architectural judgements (why POM over inline selectors, why single-worker, the CI note) came from my own experience.
- Final review of each test for correctness — I read every generated spec and verified the assertions matched what the Conduit API actually returns (checked against the live API responses during the pre-flight probing).
- The `FIXED_USER` strategy — the decision to have one seeded account for UI tests and dynamic timestamps for API tests was my call, not a Claude suggestion. I asked Claude to implement it once I had decided on the approach.
