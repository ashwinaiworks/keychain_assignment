// ---------------------------------------------------------------------------
// Conduit API client
// ---------------------------------------------------------------------------
// A thin, typed wrapper around the Conduit REST API. All network calls in
// factories and tests go through here — never use raw fetch in test files.
//
// Usage (from a test or factory):
//   const api = new ApiClient();
//   const { user } = await api.register({ user: { ... } });
//   api.setToken(user.token);
//   const { article } = await api.createArticle({ article: { ... } });
// ---------------------------------------------------------------------------

import {
  RegisterRequest,
  LoginRequest,
  UserResponse,
  ArticleResponse,
  ArticlesResponse,
  CreateArticleRequest,
  UpdateArticleRequest,
  CommentResponse,
  CommentsResponse,
  AddCommentRequest,
  ProfileResponse,
  TagsResponse,
} from './types';

const API_BASE = process.env.API_URL ?? 'http://localhost:3000/api';

export class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private headers(extra?: Record<string, string>): Record<string, string> {
    const base: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) base['Authorization'] = `Token ${this.token}`;
    return { ...base, ...extra };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // Some responses (e.g. 404, 403 on this Conduit build) are plain text.
    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      throw new ApiResponseError(res.status, payload);
    }

    return payload as T;
  }

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  register(body: RegisterRequest): Promise<UserResponse> {
    return this.request('POST', '/users', body);
  }

  login(body: LoginRequest): Promise<UserResponse> {
    return this.request('POST', '/users/login', body);
  }

  // -------------------------------------------------------------------------
  // Articles
  // -------------------------------------------------------------------------

  getArticles(params?: { limit?: number; offset?: number; tag?: string; author?: string }): Promise<ArticlesResponse> {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    if (params?.tag) qs.set('tag', params.tag);
    if (params?.author) qs.set('author', params.author);
    const query = qs.toString();
    return this.request('GET', `/articles${query ? `?${query}` : ''}`);
  }

  getArticle(slug: string): Promise<ArticleResponse> {
    return this.request('GET', `/articles/${slug}`);
  }

  createArticle(body: CreateArticleRequest): Promise<ArticleResponse> {
    return this.request('POST', '/articles', body);
  }

  updateArticle(slug: string, body: UpdateArticleRequest): Promise<ArticleResponse> {
    return this.request('PUT', `/articles/${slug}`, body);
  }

  deleteArticle(slug: string): Promise<void> {
    return this.request('DELETE', `/articles/${slug}`);
  }

  // -------------------------------------------------------------------------
  // Comments
  // -------------------------------------------------------------------------

  getComments(slug: string): Promise<CommentsResponse> {
    return this.request('GET', `/articles/${slug}/comments`);
  }

  addComment(slug: string, body: AddCommentRequest): Promise<CommentResponse> {
    return this.request('POST', `/articles/${slug}/comments`, body);
  }

  deleteComment(slug: string, commentId: number): Promise<void> {
    return this.request('DELETE', `/articles/${slug}/comments/${commentId}`);
  }

  // -------------------------------------------------------------------------
  // Favourites
  // -------------------------------------------------------------------------

  favouriteArticle(slug: string): Promise<ArticleResponse> {
    return this.request('POST', `/articles/${slug}/favorite`);
  }

  unfavouriteArticle(slug: string): Promise<ArticleResponse> {
    return this.request('DELETE', `/articles/${slug}/favorite`);
  }

  // -------------------------------------------------------------------------
  // Profiles / follows
  // -------------------------------------------------------------------------

  getProfile(username: string): Promise<ProfileResponse> {
    return this.request('GET', `/profiles/${username}`);
  }

  followUser(username: string): Promise<ProfileResponse> {
    return this.request('POST', `/profiles/${username}/follow`);
  }

  unfollowUser(username: string): Promise<ProfileResponse> {
    return this.request('DELETE', `/profiles/${username}/follow`);
  }

  // -------------------------------------------------------------------------
  // Tags
  // -------------------------------------------------------------------------

  getTags(): Promise<TagsResponse> {
    return this.request('GET', '/tags');
  }
}

// ---------------------------------------------------------------------------
// Error type — lets tests assert on HTTP status without parsing strings
// ---------------------------------------------------------------------------

export class ApiResponseError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API responded with ${status}`);
    this.name = 'ApiResponseError';
  }
}
