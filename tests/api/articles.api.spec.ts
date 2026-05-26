import { test, expect } from '../fixtures';
import { ApiResponseError } from '../../lib/api/client';
import { ArticleFactory } from '../../lib/factories/article.factory';
import { CommentFactory } from '../../lib/factories/comment.factory';
import { UserFactory } from '../../lib/factories/user.factory';

// ---------------------------------------------------------------------------
// Articles API — CRUD, comments, favourites
// ---------------------------------------------------------------------------

test.describe('POST /api/articles — create', { tag: ['@articles', '@api'] }, () => {
  test('creates an article and returns it with a slug', { tag: '@smoke' }, async ({ authApi }) => {
    const fields = ArticleFactory.buildFields();

    const { article } = await authApi.client.createArticle({ article: fields });

    expect(article.slug).toBeTruthy();
    expect(article.title).toBe(fields.title);
    expect(article.description).toBe(fields.description);
    expect(article.body).toBe(fields.body);
    expect(article.author.username).toBe(authApi.user.user.username);
  });

  test('returns 401 when not authenticated', async ({ api }) => {
    const fields = ArticleFactory.buildFields();

    const error = await api
      .createArticle({ article: fields })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ApiResponseError);
    expect((error as ApiResponseError).status).toBe(401);
  });
});

test.describe('GET /api/articles/:slug — read', { tag: ['@articles', '@api'] }, () => {
  test('fetches an article by slug', async ({ authApi }) => {
    const { article: created } = await ArticleFactory.create(authApi.client);

    const { article } = await authApi.client.getArticle(created.slug);

    expect(article.slug).toBe(created.slug);
    expect(article.title).toBe(created.title);
  });

  test('returns 404 for a non-existent slug', async ({ api }) => {
    const error = await api.getArticle('this-slug-does-not-exist-99999').catch((e) => e);

    expect(error).toBeInstanceOf(ApiResponseError);
    expect((error as ApiResponseError).status).toBe(404);
  });
});

test.describe('PUT /api/articles/:slug — update', { tag: ['@articles', '@api'] }, () => {
  test('author can update their article', async ({ authApi }) => {
    const { article } = await ArticleFactory.create(authApi.client);
    const newTitle = `Updated ${Date.now()}`;

    const { article: updated } = await authApi.client.updateArticle(article.slug, {
      article: { title: newTitle },
    });

    expect(updated.title).toBe(newTitle);
    // Note: this Conduit build does not regenerate the slug on title update.
  });

  test('another user cannot update someone else\'s article', async ({ authApi }) => {
    const { article } = await test.step('create article as user A', () =>
      ArticleFactory.create(authApi.client),
    );

    const otherApi = new (await import('../../lib/api/client')).ApiClient();
    await test.step('create and authenticate user B', () =>
      UserFactory.createAndLogin(otherApi),
    );

    const error = await test.step('user B attempts to update user A\'s article', () =>
      otherApi
        .updateArticle(article.slug, { article: { title: 'Hijacked' } })
        .catch((e) => e),
    );

    expect(error).toBeInstanceOf(ApiResponseError);
    expect((error as ApiResponseError).status).toBe(403);
  });
});

test.describe('DELETE /api/articles/:slug', { tag: ['@articles', '@api'] }, () => {
  test('author can delete their own article', async ({ authApi }) => {
    const { article } = await ArticleFactory.create(authApi.client);

    await authApi.client.deleteArticle(article.slug);

    const error = await authApi.client.getArticle(article.slug).catch((e) => e);
    expect(error).toBeInstanceOf(ApiResponseError);
    expect((error as ApiResponseError).status).toBe(404);
  });
});

test.describe('GET /api/articles — list and filter', { tag: ['@articles', '@api'] }, () => {
  test('returns a list of articles', async ({ api }) => {
    const { articles, articlesCount } = await api.getArticles({ limit: 5 });

    expect(Array.isArray(articles)).toBe(true);
    expect(typeof articlesCount).toBe('number');
  });

  test('filters articles by author', async ({ authApi }) => {
    await ArticleFactory.create(authApi.client);

    const { articles } = await authApi.client.getArticles({
      author: authApi.user.user.username,
    });

    expect(articles.length).toBeGreaterThan(0);
    articles.forEach((a) => {
      expect(a.author.username).toBe(authApi.user.user.username);
    });
  });
});

test.describe('Comments', { tag: ['@comments', '@api'] }, () => {
  test('adds a comment to an article', { tag: '@smoke' }, async ({ authApi }) => {
    const { article } = await ArticleFactory.create(authApi.client);
    const body = CommentFactory.buildBody();

    const { comment } = await CommentFactory.create(authApi.client, article.slug, body);

    expect(comment.id).toBeTruthy();
    expect(comment.body).toBe(body);
    expect(comment.author.username).toBe(authApi.user.user.username);
  });

  test('lists comments on an article', async ({ authApi }) => {
    const { article } = await ArticleFactory.create(authApi.client);
    await CommentFactory.createMany(authApi.client, article.slug, 2);

    const { comments } = await authApi.client.getComments(article.slug);

    expect(comments.length).toBeGreaterThanOrEqual(2);
  });

  test('deletes a comment', async ({ authApi }) => {
    const { article } = await test.step('create article', () =>
      ArticleFactory.create(authApi.client),
    );

    const { comment } = await test.step('add comment via factory', () =>
      CommentFactory.create(authApi.client, article.slug),
    );

    await test.step('delete comment', () =>
      authApi.client.deleteComment(article.slug, comment.id),
    );

    const { comments } = await test.step('verify comment is gone', () =>
      authApi.client.getComments(article.slug),
    );

    expect(comments.find((c) => c.id === comment.id)).toBeUndefined();
  });
});

test.describe('Favourites', { tag: ['@favourites', '@api'] }, () => {
  test('favourites an article and increments the count', { tag: '@smoke' }, async ({ authApi }) => {
    const { article } = await ArticleFactory.create(authApi.client);

    const { article: faved } = await authApi.client.favouriteArticle(article.slug);

    expect(faved.favorited).toBe(true);
    expect(faved.favoritesCount).toBe(1);
  });

  test('unfavourites an article and decrements the count', async ({ authApi }) => {
    const { article } = await test.step('create article', () =>
      ArticleFactory.create(authApi.client),
    );

    await test.step('favourite it', () =>
      authApi.client.favouriteArticle(article.slug),
    );

    const { article: unfaved } = await test.step('unfavourite it', () =>
      authApi.client.unfavouriteArticle(article.slug),
    );

    expect(unfaved.favorited).toBe(false);
    expect(unfaved.favoritesCount).toBe(0);
  });
});
