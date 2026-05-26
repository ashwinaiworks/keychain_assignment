import { test, expect } from '../fixtures';
import { UserFactory } from '../../lib/factories/user.factory';
import { ApiClient } from '../../lib/api/client';

// ---------------------------------------------------------------------------
// Profiles API — follow and unfollow
// ---------------------------------------------------------------------------

test.describe('GET /api/profiles/:username', { tag: ['@profile', '@api'] }, () => {
  test('returns a profile for an existing user', { tag: '@smoke' }, async ({ authApi }) => {
    await test.step('fetch profile', async () => {
      const { profile } = await authApi.client.getProfile(authApi.user.user.username);

      expect(profile.username).toBe(authApi.user.user.username);
      expect(typeof profile.following).toBe('boolean');
    });
  });
});

test.describe('POST /api/profiles/:username/follow', { tag: ['@profile', '@api'] }, () => {
  test('authenticated user can follow another user', async ({ authApi }) => {
    // Create a second user to follow
    const otherApi = new ApiClient();
    const { user: other } = await UserFactory.create(otherApi);

    await test.step('follow the user', async () => {
      const { profile } = await authApi.client.followUser(other.username);
      expect(profile.following).toBe(true);
      expect(profile.username).toBe(other.username);
    });
  });

  test('following is reflected on the profile', async ({ authApi }) => {
    const otherApi = new ApiClient();
    const { user: other } = await UserFactory.create(otherApi);

    await test.step('follow', async () => {
      await authApi.client.followUser(other.username);
    });

    await test.step('verify profile shows following=true', async () => {
      const { profile } = await authApi.client.getProfile(other.username);
      expect(profile.following).toBe(true);
    });
  });
});

test.describe('DELETE /api/profiles/:username/follow', { tag: ['@profile', '@api'] }, () => {
  test('authenticated user can unfollow a followed user', async ({ authApi }) => {
    const otherApi = new ApiClient();
    const { user: other } = await UserFactory.create(otherApi);

    await test.step('follow first', async () => {
      await authApi.client.followUser(other.username);
    });

    await test.step('unfollow', async () => {
      const { profile } = await authApi.client.unfollowUser(other.username);
      expect(profile.following).toBe(false);
    });

    await test.step('verify profile shows following=false', async () => {
      const { profile } = await authApi.client.getProfile(other.username);
      expect(profile.following).toBe(false);
    });
  });
});
