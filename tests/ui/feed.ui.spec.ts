import { test, expect } from '../fixtures';
import { HomePage } from '../../lib/pages/home.page';
import { ArticleFactory } from '../../lib/factories/article.factory';

// ---------------------------------------------------------------------------
// Feed UI — home page, navigation, global feed
// ---------------------------------------------------------------------------
// Note: .banner is only shown to unauthenticated users in this Conduit build.
// Guest and logged-in states use nav.navbar as the primary reliable element.
// ---------------------------------------------------------------------------

test.describe('Home page', () => {
  test('shows the Conduit banner for unauthenticated visitors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Banner is shown to guests only
    await expect(page.locator('.banner h1')).toContainText('conduit');
  });

  test('nav shows Sign In and Sign Up for unauthenticated visitors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('nav.navbar');

    await expect(nav).toContainText('Sign in');
    await expect(nav).toContainText('Sign up');
  });

  test('nav shows username, New Article, and Settings for logged-in users', async ({ loggedInPage }) => {
    const { page, user } = loggedInPage;
    const homePage = new HomePage(page);
    await homePage.goto();

    const nav = page.locator('nav.navbar');
    await expect(nav).toContainText('New Post');
    await expect(nav).toContainText('Settings');
    await expect(nav).toContainText(user.username);
  });
});

test.describe('Global feed', () => {
  test('shows published articles in the global feed', async ({ page, authApi }) => {
    await ArticleFactory.create(authApi.client);

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.clickGlobalFeed();

    const previews = page.locator('.article-preview');
    await expect(previews.first()).toBeVisible();
  });

  test('each article preview links to the full article page', async ({ page, authApi }) => {
    const { article } = await ArticleFactory.create(authApi.client);

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.clickGlobalFeed();

    const link = page.locator('.preview-link', { hasText: article.title });
    await link.first().click();

    await expect(page).toHaveURL(new RegExp(`/article/${article.slug}`));
  });
});
