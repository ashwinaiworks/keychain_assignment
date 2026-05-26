# Conduit Test Framework

Playwright + TypeScript test framework for the [Conduit RealWorld app](https://github.com/cirosantilli/node-express-sequelize-realworld-example-app).

Covers: user auth, articles (CRUD), comments, and favourites — with both API and UI tests.

---

## Prerequisites

- Node.js 18+
- Git
- The Conduit app running locally (see below)

---

## Step 1 — Start the Conduit app

The tests run against a locally running instance of Conduit. Clone and start it:

```bash
git clone https://github.com/cirosantilli/node-express-sequelize-realworld-example-app
cd node-express-sequelize-realworld-example-app
npm install && npm start
```

Leave this terminal running. The app starts two servers:
- UI → http://localhost:4101
- API → http://localhost:3000/api

---

## Step 2 — Set up this framework

In a separate terminal, clone this repo and install dependencies:

```bash
git clone <this-repo-url>
cd conduit-test-framework
npm install
npx playwright install chromium
```

---

## Step 3 — Run the tests

```bash
npm test
```

The first run seeds a fixed test user (`conduit_tester@test.local`) via `global-setup.ts`. Subsequent runs skip creation and reuse the account — no manual setup needed.

---

## Run a subset

```bash
npm run test:api      # API tests only (faster, no browser)
npm run test:ui       # UI tests only
npm run test:headed   # UI tests with browser visible
```

---

## View the report

```bash
npm run report
```

Opens the Playwright HTML report in your browser. The report is also written to `playwright-report/` after every run.

---

## Test accounts

A fixed account is created automatically by the test setup:

| Field | Value |
|---|---|
| Email | `conduit_tester@test.local` |
| Password | `Test1234!` |
| Username | `conduit_tester` |

See `test-credentials.txt` for the full list. API tests create additional accounts with timestamp-based emails (`user_<timestamp>@test.local`) — these accumulate in the database across runs but do not affect test isolation.

---

## Folder structure

```
lib/
  api/          ← Typed API client and response types
  factories/    ← Test data factories (user, article)
  pages/        ← Page objects (login, register, home, editor)
tests/
  fixtures/     ← Shared Playwright fixtures — import test from here
  api/          ← API-layer tests (no browser)
  ui/           ← Browser tests
global-setup.ts ← Seeds the fixed test user before the suite runs
CLAUDE.md       ← Instructions for AI coding agents working in this repo
DECISIONS.md    ← Architecture decision log
AI_USAGE.md     ← How AI tools were used during development
```

---

## Resetting the database

If you want a clean state:

```bash
# Inside the Conduit app directory
rm -f db.sqlite
npm start
```

The next `npm test` run will re-seed the fixed test user automatically.

---

## Troubleshooting

**`Cannot reach Conduit API`** — The Conduit app is not running. Complete Step 1 above.

**`422 on fixed user login`** — The database was reset but the password changed. Delete `db.sqlite` and restart the app.

**Selector failures on UI tests** — Run `npm run test:headed` to watch the browser and identify which element is missing.