// ---------------------------------------------------------------------------
// Shared Playwright fixtures
// ---------------------------------------------------------------------------
// Import test and expect from here in every spec file, not from
// '@playwright/test' directly. This gives every test access to the
// shared fixtures below without any extra setup.
//
//   import { test, expect } from '../fixtures';
// ---------------------------------------------------------------------------

import { test as base, expect } from '@playwright/test';
import { ApiClient } from '../../lib/api/client';
import { UserFactory, CreatedUser } from '../../lib/factories/user.factory';
import { LoginPage } from '../../lib/pages/login.page';

// ---------------------------------------------------------------------------
// Fixed test account — created once by global-setup.ts and reused by UI tests
// that need a pre-authenticated session without going through the register flow.
// ---------------------------------------------------------------------------
export const FIXED_USER = {
  username: 'conduit_tester',
  email: 'conduit_tester@test.local',
  password: 'Test1234!',
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
export const test = base.extend<{
  /** A fresh, unauthenticated ApiClient. */
  api: ApiClient;

  /** An authenticated ApiClient for a brand-new unique user (fresh per test). */
  authApi: { client: ApiClient; user: CreatedUser };

  /**
   * An ApiClient authenticated as the fixed test user (conduit_tester).
   * Use alongside loggedInPage so the browser session and API token belong
   * to the same account — important for author-only actions like edit/delete.
   */
  loggedInApi: ApiClient;

  /** A Playwright Page already logged in as the fixed test user. */
  loggedInPage: { page: import('@playwright/test').Page; user: typeof FIXED_USER };
}>({
  api: async ({}, use) => {
    await use(new ApiClient());
  },

  authApi: async ({}, use) => {
    const client = new ApiClient();
    const user = await UserFactory.createAndLogin(client);
    await use({ client, user });
  },

  loggedInApi: async ({}, use) => {
    const client = new ApiClient();
    const { user } = await client.login({
      user: { email: FIXED_USER.email, password: FIXED_USER.password },
    });
    client.setToken(user.token);
    await use(client);
  },

  loggedInPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(FIXED_USER.email, FIXED_USER.password);
    await use({ page, user: FIXED_USER });
  },
});

export { expect };
