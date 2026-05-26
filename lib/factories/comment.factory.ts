// ---------------------------------------------------------------------------
// Comment factory
// ---------------------------------------------------------------------------
// Creates real comments via the API. The caller must pass an authenticated
// ApiClient and a target article slug.
//
// Usage:
//   const { comment } = await CommentFactory.create(api, article.slug);
//   const comments   = await CommentFactory.createMany(api, article.slug, 3);
// ---------------------------------------------------------------------------

import { ApiClient } from '../api/client';
import { CommentPayload } from '../api/types';

export interface CreatedComment {
  comment: CommentPayload;
}

export const CommentFactory = {
  /**
   * Build comment body text without hitting the API.
   */
  buildBody(suffix?: string): string {
    return `Test comment ${suffix ?? Date.now()}`;
  },

  /**
   * Create a single comment on an article.
   * The ApiClient must already have a token set.
   */
  async create(api: ApiClient, slug: string, body?: string): Promise<CreatedComment> {
    return api.addComment(slug, {
      comment: { body: body ?? CommentFactory.buildBody() },
    });
  },

  /**
   * Create multiple comments on the same article.
   */
  async createMany(api: ApiClient, slug: string, count: number): Promise<CreatedComment[]> {
    const results: CreatedComment[] = [];
    for (let i = 0; i < count; i++) {
      results.push(await CommentFactory.create(api, slug, `Comment ${i + 1} — ${Date.now()}`));
    }
    return results;
  },
};
