# tests/ — spec map

Quick reference for every spec file. Open this before writing a new test.

---

## API tests (`tests/api/`)

No browser involved — pure HTTP via `ApiClient`. Fast, runs in milliseconds.

| File | Feature | Tags | What it covers |
|---|---|---|---|
| `auth.api.spec.ts` | Auth | `@auth @api` | Register, login, duplicate user, bad credentials |
| `articles.api.spec.ts` | Articles | `@articles @api` | Create, read, update, delete, list, filter by author |
| `articles.api.spec.ts` | Comments | `@comments @api` | Add, list, delete comments |
| `articles.api.spec.ts` | Favourites | `@favourites @api` | Favourite and unfavourite an article |
| `profiles.api.spec.ts` | Profile | `@profile @api` | Get profile, follow, unfollow |

---

## UI tests (`tests/ui/`)

Browser tests using page objects. Slower — expect 1–3 seconds per test.

| File | Feature | Tags | What it covers |
|---|---|---|---|
| `auth.ui.spec.ts` | Auth | `@auth @ui` | Register flow, login flow, logout |
| `articles.ui.spec.ts` | Articles | `@articles @ui` | Publish article, view article, edit, delete button |
| `feed.ui.spec.ts` | Feed | `@feed @ui` | Home page banner, nav state, global feed, article links |

---

## Fixtures (`tests/fixtures/index.ts`)

Import `test` and `expect` from here in every spec file.

| Fixture | Use when |
|---|---|
| `api` | Test manages its own auth (e.g. registration tests) |
| `authApi` | Need an authenticated API client as a fresh unique user |
| `loggedInApi` | Need an API client as `conduit_tester` (same user as the browser) |
| `loggedInPage` | UI test that starts from a logged-in browser session |
| `page` | UI test for guest / unauthenticated flows |

---

## Tag reference

Run a subset of tests with `npm run test:<tag>`:

| Command | Runs |
|---|---|
| `npm run test:smoke` | 1 critical test per feature — fast sanity check |
| `npm run test:auth` | All auth tests (API + UI) |
| `npm run test:articles` | All article tests (API + UI) |
| `npm run test:comments` | Comment tests |
| `npm run test:favourites` | Favourites tests |
| `npm run test:feed` | Feed/home page UI tests |
| `npm run test:api` | All API tests (by folder) |
| `npm run test:ui` | All UI tests (by folder) |
| `npm test` | Everything |

---

## Adding a new spec file

1. Pick the right folder: `tests/api/` for API-only, `tests/ui/` for browser tests
2. Name it `<feature>.<layer>.spec.ts` — e.g. `profile.ui.spec.ts`
3. Add `{ tag: ['@<feature>', '@<layer>'] }` to every `test.describe` block
4. Add `{ tag: '@smoke' }` to the single most critical test in the file
5. Update this README — add a row to the table above
