// ---------------------------------------------------------------------------
// Global setup — runs once before the entire test suite
// ---------------------------------------------------------------------------
// Responsibilities:
//   1. Verify the Conduit API is reachable (fast-fail with a clear message).
//   2. Ensure the fixed test user exists. If registration fails because the
//      account already exists, we attempt a login instead — this makes the
//      setup idempotent across multiple local runs.
// ---------------------------------------------------------------------------

import { ApiClient, ApiResponseError } from './lib/api/client';
import { FIXED_USER } from './tests/fixtures/index';

async function globalSetup() {
  const api = new ApiClient();

  // -- 1. Health check ------------------------------------------------------
  try {
    await api.getArticles({ limit: 1 });
  } catch (err) {
    throw new Error(
      'Cannot reach Conduit API at http://localhost:3000/api — make sure the app is running.\n' +
      '  cd node-express-sequelize-realworld-example-app && npm start\n',
    );
  }

  // -- 2. Seed fixed test user ----------------------------------------------
  try {
    await api.register({
      user: {
        username: FIXED_USER.username,
        email: FIXED_USER.email,
        password: FIXED_USER.password,
      },
    });
    console.log(`[setup] Created fixed test user: ${FIXED_USER.email}`);
  } catch (err) {
    // This Conduit build returns 404 (not the spec's 422) for duplicate users.
    if (err instanceof ApiResponseError && (err.status === 422 || err.status === 404)) {
      // User already exists — verify we can still log in
      try {
        await api.login({ user: { email: FIXED_USER.email, password: FIXED_USER.password } });
        console.log(`[setup] Fixed test user already exists: ${FIXED_USER.email}`);
      } catch {
        throw new Error(
          `Fixed test user exists but login failed. ` +
          `If the database was reset, delete it and restart the app.\n` +
          `  Email: ${FIXED_USER.email} / Password: ${FIXED_USER.password}`,
        );
      }
    } else {
      throw err;
    }
  }
}

export default globalSetup;
