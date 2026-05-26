# CLAUDE.md — Agent guide for this test framework

This file is the entry point for any AI coding agent (Claude Code, Copilot, Cursor, etc.) working in this repo. Read it before writing a single line of code.

---

## What this repo is

A Playwright + TypeScript test framework for the [Conduit RealWorld app](https://github.com/cirosantilli/node-express-sequelize-realworld-example-app) — a Medium-style blogging platform with a React UI and a REST API.

- UI runs at **http://localhost:4101**
- API runs at **http://localhost:3000/api**

Both must be running locally before the tests can execute.

---

## Folder map — where things live

```
lib/
  api/
    types.ts          ← All API request/response types. Add new types here.
    client.ts         ← ApiClient class. Add new API methods here.
  factories/
    user.factory.ts   ← Creates users via API. Use this to make test accounts.
    article.factory.ts← Creates articles via API. Use this for test data.
  pages/
    login.page.ts     ← Page object for /login
    register.page.ts  ← Page object for /register
    home.page.ts      ← Page object for / (feed)
    editor.page.ts    ← Page object for /editor (create/edit articles)

tests/
  fixtures/
    index.ts          ← Import test + expect from here, not from @playwright/test
  api/
    *.api.spec.ts     ← API-only tests (no browser, just fetch)
  ui/
    *.ui.spec.ts      ← Browser tests using page objects

global-setup.ts       ← Runs once before all tests. Seeds the fixed test user.
playwright.config.ts  ← Single Chromium project, points at localhost:4101
```

---

## Rules — follow these every time

### 1. Always import from the fixtures file

```ts
// ✅ correct
import { test, expect } from '../fixtures';

// ❌ wrong — you miss the shared fixtures
import { test, expect } from '@playwright/test';
```

### 2. Never hardcode test credentials

```ts
// ✅ correct
const credentials = UserFactory.buildCredentials();
const { user } = await UserFactory.create(api);

// ❌ wrong
const email = 'myuser@test.com';
const password = 'hardcoded';
```

The only hardcoded account is `FIXED_USER` in `tests/fixtures/index.ts`. That is intentional — it is seeded once by `global-setup.ts` and reused by UI tests that need a pre-authenticated session.

### 3. Never call fetch or axios directly in a test

```ts
// ✅ correct
const { article } = await authApi.client.createArticle({ article: fields });

// ❌ wrong
const res = await fetch('http://localhost:3000/api/articles', { ... });
```

All API calls go through `ApiClient` in `lib/api/client.ts`. If a method is missing, add it there first.

### 4. Use factories for all test data

```ts
// ✅ correct
const { article } = await ArticleFactory.create(authApi.client);

// ❌ wrong — hardcoded, collides across runs
await authApi.client.createArticle({ article: { title: 'My Article', ... } });
```

### 5. Name spec files by layer and domain

| Layer | Pattern | Example |
|---|---|---|
| API | `<domain>.api.spec.ts` | `comments.api.spec.ts` |
| UI | `<domain>.ui.spec.ts` | `profile.ui.spec.ts` |

### 6. Use `test.describe` to group related tests

```ts
test.describe('POST /api/articles — create', () => {
  test('creates an article', ...);
  test('returns 401 when not authenticated', ...);
});
```

### 7. Tag every new `test.describe` block with a feature tag and a layer tag

Every describe block must carry exactly two tags — one feature tag and one layer tag.

```ts
// ✅ correct
test.describe('Comments', { tag: ['@comments', '@api'] }, () => { ... });
test.describe('Login flow', { tag: ['@auth', '@ui'] }, () => { ... });

// ❌ wrong — missing tags, test won't be reachable via npm run test:<feature>
test.describe('Comments', () => { ... });
```

**Available feature tags:** `@auth` · `@articles` · `@comments` · `@favourites` · `@feed`

**Layer tags:** `@api` (no browser) · `@ui` (browser test)

Add a new feature tag if you are covering a new domain (e.g. `@profile`, `@follows`). Document it in this file under the tag table below.

### 8. Assert on the HTTP status, not on error message strings

```ts
// ✅ correct
expect((error as ApiResponseError).status).toBe(422);

// ❌ fragile — error messages change
expect(error.message).toContain('unprocessable');
```

---

## How to add a new API test

1. Check if the API method exists in `lib/api/client.ts`. Add it if not.
2. Add the corresponding types to `lib/api/types.ts`.
3. Create `tests/api/<domain>.api.spec.ts`.
4. Import `{ test, expect }` from `../fixtures`.
5. Use `api` fixture for unauthenticated calls, `authApi` for authenticated ones.

**Minimal example:**

```ts
import { test, expect } from '../fixtures';
import { ApiResponseError } from '../../lib/api/client';

test.describe('GET /api/tags', () => {
  test('returns a list of tags', async ({ api }) => {
    const { tags } = await api.getTags();
    expect(Array.isArray(tags)).toBe(true);
  });
});
```

---

## How to add a new UI test

1. Check if a page object exists in `lib/pages/`. Add one if the page is new.
2. Create `tests/ui/<domain>.ui.spec.ts`.
3. Import `{ test, expect }` from `../fixtures`.
4. Use `loggedInPage` fixture if the test needs a logged-in user. Use `page` for guest flows.

**Minimal example:**

```ts
import { test, expect } from '../fixtures';
import { HomePage } from '../../lib/pages/home.page';

test('home page shows the banner', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await expect(page.locator('.banner')).toBeVisible();
});
```

---

## How to add a new page object

Create `lib/pages/<name>.page.ts`. Follow this structure:

```ts
import { Page, expect } from '@playwright/test';

export class MyPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/my-route');
    await expect(this.page.locator('.some-element')).toBeVisible();
  }

  async doSomething() { ... }

  async expectSomething() { ... }
}
```

Group methods into three sections: navigation (`goto`), actions, assertions (`expect*`).

---

## Available fixtures

| Fixture | Type | When to use |
|---|---|---|
| `api` | `ApiClient` | Tests that manage their own auth (e.g. registration) |
| `authApi` | `{ client: ApiClient, user: CreatedUser }` | Tests that need an authenticated API client |
| `loggedInPage` | `{ page: Page, user: FIXED_USER }` | UI tests that start from a logged-in state |
| `page` | `Page` | UI tests for guest / unauthenticated flows |

---

## Running the tests

```bash
npm test                 # all tests
npm run test:api         # API tests only (by folder)
npm run test:ui          # UI tests only (by folder)
npm run test:headed      # UI tests with browser visible
npm run test:auth        # @auth tag — registration, login, logout
npm run test:articles    # @articles tag — article CRUD
npm run test:comments    # @comments tag — comments
npm run test:favourites  # @favourites tag — favourites
npm run test:feed        # @feed tag — home page and global feed
npm run report           # open the HTML report
```

You can also combine tags ad-hoc without a script:
```bash
npx playwright test --grep "@auth|@feed"   # run auth OR feed tests
npx playwright test --grep-invert @ui      # skip all UI tests
```
