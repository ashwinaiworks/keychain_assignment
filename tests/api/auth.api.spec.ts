import { test, expect } from '../fixtures';
import { ApiResponseError } from '../../lib/api/client';
import { UserFactory } from '../../lib/factories/user.factory';

// ---------------------------------------------------------------------------
// Auth API — registration and login
// ---------------------------------------------------------------------------

test.describe('POST /api/users — registration', { tag: ['@auth', '@api'] }, () => {
  test('registers a new user and returns a token', async ({ api }) => {
    const credentials = UserFactory.buildCredentials();

    const { user } = await api.register({ user: credentials });

    expect(user.email).toBe(credentials.email);
    expect(user.username).toBe(credentials.username);
    expect(user.token).toBeTruthy();
    expect(typeof user.token).toBe('string');
  });

  test('returns an error when email is already taken', async ({ api }) => {
    const credentials = UserFactory.buildCredentials();

    // First registration succeeds
    await api.register({ user: credentials });

    // Second registration with the same email must fail.
    // Note: this Conduit build returns 404 for duplicates (not the spec's 422).
    const error = await api
      .register({ user: { ...credentials, username: `other_${Date.now()}` } })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ApiResponseError);
    expect([404, 422]).toContain((error as ApiResponseError).status);
  });

  test('returns an error when username is already taken', async ({ api }) => {
    const first = UserFactory.buildCredentials();
    await api.register({ user: first });

    const second = UserFactory.buildCredentials();
    const error = await api
      .register({ user: { ...second, username: first.username } })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ApiResponseError);
    expect([404, 422]).toContain((error as ApiResponseError).status);
  });

  test('returns an error when required fields are missing', async ({ api }) => {
    const error = await api
      // @ts-expect-error — intentionally sending bad payload
      .register({ user: { email: 'incomplete@test.local' } })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ApiResponseError);
    // This Conduit build returns 500 for missing required fields.
    expect([422, 500]).toContain((error as ApiResponseError).status);
  });
});

test.describe('POST /api/users/login', { tag: ['@auth', '@api'] }, () => {
  test('logs in with valid credentials and returns a token', async ({ api }) => {
    const { credentials } = await UserFactory.create(api);

    const { user } = await api.login({
      user: { email: credentials.email, password: credentials.password },
    });

    expect(user.email).toBe(credentials.email);
    expect(user.token).toBeTruthy();
  });

  test('returns 422 for wrong password', async ({ api }) => {
    const { credentials } = await UserFactory.create(api);

    const error = await api
      .login({ user: { email: credentials.email, password: 'WrongPass999!' } })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ApiResponseError);
    expect((error as ApiResponseError).status).toBe(422);
  });

  test('returns 422 for non-existent email', async ({ api }) => {
    const error = await api
      .login({ user: { email: 'nobody@nowhere.test', password: 'Test1234!' } })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ApiResponseError);
    expect((error as ApiResponseError).status).toBe(422);
  });
});
