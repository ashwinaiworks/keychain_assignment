import { test, expect } from '../fixtures';
import { EditorPage } from '../../lib/pages/editor.page';
import { ArticleFactory } from '../../lib/factories/article.factory';

// ---------------------------------------------------------------------------
// Articles UI — create, view, edit, delete
// ---------------------------------------------------------------------------
// loggedInApi is used alongside loggedInPage so the browser session and the
// API token belong to the same account (conduit_tester). This is required for
// author-only actions like editing and deleting.
// ---------------------------------------------------------------------------

test.describe('Create article', { tag: ['@articles', '@ui'] }, () => {
  test('logged-in user can publish a new article', async ({ loggedInPage }) => {
    const { page } = loggedInPage;
    const editor = new EditorPage(page);
    const title = `UI Article ${Date.now()}`;

    await editor.gotoNew();
    await editor.createArticle(
      title,
      'A description written during a UI test.',
      'Full article body — enough content to pass validation.',
      ['playwright', 'test'],
    );

    await expect(page.locator('.article-page')).toBeVisible();
    await expect(page.locator('h1')).toContainText(title);
  });
});

test.describe('View article', { tag: ['@articles', '@ui'] }, () => {
  test('article detail page shows title, body, and author', async ({ page, authApi }) => {
    const { article } = await ArticleFactory.create(authApi.client);

    await page.goto(`/article/${article.slug}`);

    await expect(page.locator('h1')).toContainText(article.title);
    await expect(page.locator('.article-content')).toContainText(article.body);
    await expect(page.locator('.article-page')).toContainText(article.author.username);
  });
});

test.describe('Edit article', { tag: ['@articles', '@ui'] }, () => {
  test('author can edit their article and see the updated title', async ({ loggedInPage, loggedInApi }) => {
    const { page } = loggedInPage;
    // Create the article as conduit_tester so the browser session is the author
    const { article } = await ArticleFactory.create(loggedInApi, {
      title: `Editable ${Date.now()}`,
    });
    const updatedTitle = `Edited ${Date.now()}`;

    const editor = new EditorPage(page);
    await editor.gotoEdit(article.slug);
    await editor.fillTitle(updatedTitle);
    await editor.publish();

    await expect(page.locator('h1')).toContainText(updatedTitle);
  });
});

test.describe('Delete article', { tag: ['@articles', '@ui'] }, () => {
  test('author sees a delete button on their article page', async ({ loggedInPage, loggedInApi }) => {
    const { page } = loggedInPage;
    // Create the article as conduit_tester so the delete button is visible
    const { article } = await ArticleFactory.create(loggedInApi);

    await page.goto(`/article/${article.slug}`);

    await expect(page.getByRole('button', { name: /delete article/i })).toBeVisible();
  });
});
