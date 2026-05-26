// ---------------------------------------------------------------------------
// Conduit API — shared request / response types
// ---------------------------------------------------------------------------
// Keep these in sync with the RealWorld API spec:
// https://realworld-docs.netlify.app/docs/specs/backend-specs/endpoints
// ---------------------------------------------------------------------------

// --- User ----------------------------------------------------------------

export interface UserPayload {
  username: string;
  email: string;
  token: string;
  bio: string;
  image: string;
}

export interface RegisterRequest {
  user: {
    username: string;
    email: string;
    password: string;
  };
}

export interface LoginRequest {
  user: {
    email: string;
    password: string;
  };
}

export interface UserResponse {
  user: UserPayload;
}

// --- Profile -------------------------------------------------------------

export interface ProfilePayload {
  username: string;
  bio: string;
  image: string;
  following: boolean;
}

export interface ProfileResponse {
  profile: ProfilePayload;
}

// --- Article -------------------------------------------------------------

export interface ArticlePayload {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: ProfilePayload;
}

export interface CreateArticleRequest {
  article: {
    title: string;
    description: string;
    body: string;
    tagList?: string[];
  };
}

export interface UpdateArticleRequest {
  article: Partial<{
    title: string;
    description: string;
    body: string;
  }>;
}

export interface ArticleResponse {
  article: ArticlePayload;
}

export interface ArticlesResponse {
  articles: ArticlePayload[];
  articlesCount: number;
}

// --- Comment -------------------------------------------------------------

export interface CommentPayload {
  id: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: ProfilePayload;
}

export interface AddCommentRequest {
  comment: {
    body: string;
  };
}

export interface CommentResponse {
  comment: CommentPayload;
}

export interface CommentsResponse {
  comments: CommentPayload[];
}

// --- Tags ----------------------------------------------------------------

export interface TagsResponse {
  tags: string[];
}

// --- Errors --------------------------------------------------------------

export interface ApiError {
  errors: Record<string, string[]>;
}
