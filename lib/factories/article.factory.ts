// ---------------------------------------------------------------------------
// Article factory
// ---------------------------------------------------------------------------
// Creates real articles via the API. The caller must pass an authenticated
// ApiClient (i.e. token already set). Each call produces a unique article so
// tests that filter by title or slug stay isolated.
//
// Usage:
//   const { article } = await ArticleFactory.create(api);
//   const { article } = await ArticleFactory.create(api, { title: 'Custom' });
// ---------------------------------------------------------------------------

import { ApiClient } from '../api/client';
import { ArticlePayload } from '../api/types';

export interface ArticleOverrides {
  title?: string;
  description?: string;
  body?: string;
  tagList?: string[];
}

export interface CreatedArticle {
  article: ArticlePayload;
}

export const ArticleFactory = {
  /**
   * Build article fields without hitting the API.
   */
  buildFields(overrides?: ArticleOverrides): Required<ArticleOverrides> {
    const tag = Date.now().toString();
    return {
      title: overrides?.title ?? `Test Article ${tag}`,
      description: overrides?.description ?? 'A short description written for testing purposes.',
      body: overrides?.body ?? 'This is the article body. It has enough content to pass validation.',
      tagList: overrides?.tagList ?? ['test', 'automation'],
    };
  },

  /**
   * Create an article via the API. The ApiClient must already have a token set.
   */
  async create(api: ApiClient, overrides?: ArticleOverrides): Promise<CreatedArticle> {
    const fields = ArticleFactory.buildFields(overrides);
    return api.createArticle({ article: fields });
  },

  /**
   * Create multiple articles in sequence. Useful for feed / pagination tests.
   */
  async createMany(api: ApiClient, count: number, overrides?: ArticleOverrides): Promise<CreatedArticle[]> {
    const results: CreatedArticle[] = [];
    for (let i = 0; i < count; i++) {
      const created = await ArticleFactory.create(api, {
        ...overrides,
        title: overrides?.title ? `${overrides.title} ${i + 1}` : undefined,
      });
      results.push(created);
    }
    return results;
  },
};
