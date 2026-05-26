// ---------------------------------------------------------------------------
// User factory
// ---------------------------------------------------------------------------
// Creates real users via the API. Always use this in tests — never hardcode
// user credentials inline. Each call produces a unique user so test runs
// don't collide with each other.
//
// Usage:
//   const { user, credentials } = await UserFactory.create(api);
//   // user      → UserPayload (includes token)
//   // credentials → { email, password } for UI login flows
// ---------------------------------------------------------------------------

import { ApiClient } from '../api/client';
import { UserPayload } from '../api/types';

export interface Credentials {
  email: string;
  password: string;
  username: string;
}

export interface CreatedUser {
  user: UserPayload;
  credentials: Credentials;
}

export const UserFactory = {
  /**
   * Build unique credentials without hitting the API.
   * Useful when you need to know the data before calling register().
   */
  buildCredentials(suffix?: string): Credentials {
    const tag = suffix ?? Date.now().toString();
    return {
      username: `user_${tag}`,
      email: `user_${tag}@test.local`,
      password: 'Test1234!',
    };
  },

  /**
   * Register a new unique user and return both the API payload and the
   * plain-text credentials (needed for UI login steps).
   */
  async create(api: ApiClient, suffix?: string): Promise<CreatedUser> {
    const credentials = UserFactory.buildCredentials(suffix);
    const response = await api.register({
      user: {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
      },
    });
    return { user: response.user, credentials };
  },

  /**
   * Register and immediately authenticate the returned client.
   * Convenient for tests that need a ready-to-use authenticated client.
   */
  async createAndLogin(api: ApiClient, suffix?: string): Promise<CreatedUser> {
    const created = await UserFactory.create(api, suffix);
    api.setToken(created.user.token);
    return created;
  },
};
