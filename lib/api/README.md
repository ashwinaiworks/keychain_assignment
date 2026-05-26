# lib/api — API layer

This folder owns everything related to talking to the Conduit REST API.

---

## Files

| File | Purpose |
|---|---|
| `client.ts` | `ApiClient` class — all API methods live here |
| `types.ts` | TypeScript types for every request and response shape |

---

## Rules

**All API calls in tests and factories must go through `ApiClient`.** Never use raw `fetch` in a spec file.

**If an API method doesn't exist yet, add it to `client.ts` first.** Then add the corresponding types to `types.ts`. Then write the test.

---

## Adding a new API method

1. Add the request/response types to `types.ts`
2. Add the method to `ApiClient` in `client.ts`
3. Use it from a factory or test via the `api` / `authApi` fixture

**Example — adding a tags endpoint:**

```ts
// types.ts
export interface TagsResponse {
  tags: string[];
}

// client.ts
getTags(): Promise<TagsResponse> {
  return this.request('GET', '/tags');
}

// test
const { tags } = await api.getTags();
expect(Array.isArray(tags)).toBe(true);
```

---

## Environment

The base URL defaults to `http://localhost:3000/api`. Override it by setting `API_URL` in `.env`:

```
API_URL=http://staging.example.com/api
```

---

## Error handling

Non-2xx responses throw `ApiResponseError`. Always assert on `.status`, not on message strings:

```ts
const error = await api.createArticle(...).catch(e => e);
expect(error).toBeInstanceOf(ApiResponseError);
expect((error as ApiResponseError).status).toBe(401);
```
