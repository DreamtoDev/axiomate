# Axiomate

> Zero-boilerplate API client for JavaScript & React — define once, use everywhere.

Axiomate solves a problem every frontend developer faces: writing the same `axios.get(...)` with headers, tokens, and error handling in every single component. With Axiomate, you define your entire backend API in one file and call it anywhere with a single clean line.

---

## What's Inside

Axiomate ships with everything you need out of the box:

- **`createApi`** — define all your endpoints in one place, get clean callable functions back
- **`setTokenGetter`** — tell Axiomate where your auth token lives, it attaches it automatically
- **`addRequestInterceptor`** — run logic before every outgoing request
- **`addResponseInterceptor`** — run logic after every successful response
- **`addErrorInterceptor`** — handle errors globally (401 logout, 500 alerts, etc.)
- **`useApi`** — React hook with loading, error, data, and optimistic updates built in
- **`createPaginator`** — paginate any list endpoint with next, goTo, reset, and hasMore
- **`mock`** — develop and test without a real backend
- **`cache`** — response caching with TTL, Stale While Revalidate, and auto-eviction
- **Request deduplication** — same request fired twice? Only one network call goes out
- **Retry on failure** — auto retry with configurable count and delay
- **Dynamic URL params** — `/user/:id` resolves to `/user/5` automatically
- **File upload** — `upload: true` handles FormData and headers for you
- **Per-endpoint timeout** — heavy endpoints get more time, light ones stay fast
- **Full TypeScript support** — typed responses, typed hooks, typed paginators
- **Multiple isolated instances** — two backends? No conflict, no overwrite

---

## Installation

```bash
npm install axiomate axios
```

---

## Why Axiomate?

This is what every developer writes without Axiomate — in every component, every time:

```js
// ❌ Without Axiomate — repeated everywhere
const token = localStorage.getItem("token");

const response = await axios.post("http://localhost:8080/auth/login",
  { username, password },
  {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  }
);
```

Change the base URL? Update 50 files. Forget the token? Bug in production. New developer joins? Good luck finding which endpoint does what.

This is what the same thing looks like with Axiomate:

```js
// ✅ With Axiomate — clean, simple, always consistent
const response = await api.login({ username, password });
```

Token attached automatically. Base URL in one place. Every endpoint documented in one file.

---

## Step-by-Step Setup

### Step 1 — One-time setup in `index.js` or `App.js`

```js
import { setTokenGetter, addErrorInterceptor } from "axiomate";

// Tell Axiomate where your token lives
setTokenGetter(() => localStorage.getItem("token"));

// Handle errors globally — no try/catch needed in every component
addErrorInterceptor((error) => {
  if (error.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }
  if (error.status === 500) {
    alert("Something went wrong. Please try again.");
  }
});
```

---

### Step 2 — Define your API in one file (`api.config.js`)

```js
import { createApi } from "axiomate";

export const { api, mock, cache } = createApi({
  baseUrl: "http://localhost:8080",

  endpoints: {
    // Auth
    login:          { path: "/auth/login",        method: "POST" },
    register:       { path: "/auth/register",      method: "POST" },
    logout:         { path: "/auth/logout",        method: "POST" },

    // User — dynamic :id param + 60s cache
    getUser:        { path: "/user/:id",           method: "GET",  cache: 60000 },
    updateUser:     { path: "/user/:id",           method: "PUT"  },
    deleteUser:     { path: "/user/:id",           method: "DELETE" },

    // Products — paginated with cache
    getProducts:    { path: "/products",           method: "GET",  cache: 60000 },

    // Dashboard — Stale While Revalidate
    getDashboard:   { path: "/dashboard",          method: "GET",  cache: 30000, swr: true },

    // Stats — retry 3 times if server is flaky
    getStats:       { path: "/stats",              method: "GET",  retry: 3, retryDelay: 2000 },

    // Heavy report — needs more time
    getReport:      { path: "/report/full",        method: "GET",  timeout: 60000 },

    // File upload — FormData handled automatically
    uploadAvatar:   { path: "/user/avatar",        method: "POST", upload: true },

    // Payment — prevent double submit
    createPayment:  { path: "/payment",            method: "POST", dedupePost: true },
  },
});
```

---

### Step 3 — Use anywhere in your app

```js
import { api } from "./api.config";

// POST request
const res = await api.login({ username: "ali", password: "1234" });

// GET with dynamic URL param — resolves to /user/5
const user = await api.getUser({ id: 5 });

// GET with query params — resolves to /products?page=1&limit=10
const products = await api.getProducts({ page: 1, limit: 10 });

// File upload — FormData and headers handled automatically
await api.uploadAvatar({ avatar: fileInput.files[0], userId: 5 });
```

---

### Step 4 — React Hook

```jsx
import { useApi } from "axiomate";
import { api } from "./api.config";

// Auto call on mount — loading, error, data all managed
function ProfilePage() {
  const { data: user, loading, error } = useApi(api.getUser, {
    params: { id: 5 },
  });

  if (loading) return <p>Loading...</p>;
  if (error)   return <p>Error: {error.message}</p>;
  return <h1>Welcome, {user.name}</h1>;
}

// Manual call — for forms and buttons
function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { loading, error, execute: doLogin } = useApi(api.login, {
    immediate: false, // don't call on mount
  });

  const handleSubmit = async () => {
    const res = await doLogin({ username, password });
    localStorage.setItem("token", res.token);
  };

  return (
    <div>
      <input onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
      <input onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
      {error && <p style={{ color: "red" }}>{error.message}</p>}
    </div>
  );
}
```

---

## All Features Explained

### `createApi(config)`

The core function. Call it once per backend, get back `{ api, mock, cache }`.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `baseUrl` | string | ✅ | — | Your backend base URL |
| `endpoints` | object | ✅ | — | Map of all your endpoints |
| `headers` | object | ❌ | `{}` | Extra default headers |
| `timeout` | number | ❌ | `10000` | Global timeout in ms |
| `autoToken` | boolean | ❌ | `true` | Auto-attach Bearer token |
| `getToken` | function | ❌ | localStorage | Custom token getter for this instance |
| `maxCacheSize` | number | ❌ | `200` | Max cached entries before auto-eviction |
| `onSWRError` | function | ❌ | console.warn | Called when SWR background refetch fails |

**Endpoint options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | string | — | URL path, supports `:param` syntax |
| `method` | string | `"GET"` | HTTP method |
| `timeout` | number | global | Per-endpoint timeout override |
| `cache` | number | — | Cache TTL in ms (GET only) |
| `swr` | boolean | `false` | Stale While Revalidate |
| `retry` | number | `0` | Retry count on failure |
| `retryDelay` | number | `1000` | Delay between retries in ms |
| `upload` | boolean | `false` | File upload — sends multipart/form-data |
| `dedupePost` | boolean | `false` | Deduplicate POST requests |

---

### `setTokenGetter(fn)`

Tell Axiomate how to get your auth token. Called before every request automatically.

```js
// From localStorage
setTokenGetter(() => localStorage.getItem("token"));

// From Redux store
setTokenGetter(() => store.getState().auth.token);

// From a cookie
setTokenGetter(() => getCookie("auth_token"));
```

> For per-instance tokens (multiple backends), use `getToken` inside `createApi` instead.

---

### `addRequestInterceptor(fn)`

Runs before every outgoing request across all instances. Use it to add headers, log requests, or modify config.

```js
// Add app version to every request
addRequestInterceptor((config) => {
  config.headers["X-App-Version"] = "4.0.0";
  return config; // must return config
});

// Log every request
addRequestInterceptor((config) => {
  console.log(`→ ${config.method} ${config.url}`);
  return config;
});
```

---

### `addResponseInterceptor(fn)`

Runs after every successful response across all instances.

```js
// Save a new token if the server sends one
addResponseInterceptor((response) => {
  if (response.data?.newToken) {
    localStorage.setItem("token", response.data.newToken);
  }
  return response; // must return response
});

// Log response time
addResponseInterceptor((response) => {
  console.log(`← ${response.config.url} — ${response.status}`);
  return response;
});
```

---

### `addErrorInterceptor(fn)`

Runs when any request fails. Use it for global error handling.

```js
addErrorInterceptor((error) => {
  if (error.status === 401) {
    // Token expired — redirect to login
    window.location.href = "/login";
  }
  if (error.status === 403) {
    alert("You don't have permission to do this.");
  }
  if (!navigator.onLine) {
    alert("No internet connection.");
  }
});
```

The `error` object always has:
- `error.status` — HTTP status code (401, 403, 500, etc.)
- `error.message` — clean error message from server
- `error.data` — full server response body
- `error.original` — original axios error

---

### `useApi(apiFn, options?)`

React hook that manages loading, error, and data state for you.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `params` | object | `{}` | Default params passed to the function |
| `immediate` | boolean | `true` | Call automatically on mount |
| `initialData` | any | `null` | Initial value for data |

**Returns:** `{ data, loading, error, execute, reset }`

```jsx
// Auto call on mount
const { data, loading, error } = useApi(api.getUser, { params: { id: 5 } });

// Manual call — form submit, button click
const { execute, loading } = useApi(api.login, { immediate: false });
await execute({ username, password });

// Optimistic update — show change instantly, rollback if it fails
const { execute } = useApi(api.updateUser, { immediate: false });
await execute(
  { id: 1, name: "Ali New" },
  {
    optimisticData: { ...user, name: "Ali New" }, // show immediately
    rollbackData: user,                            // revert on failure
  }
);

// Reset state back to initial
const { reset } = useApi(api.getUser);
reset(); // clears data, error, loading
```

---

### `createPaginator(apiFn, options?)`

Tracks page numbers for you. No more manually managing `page` state.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `startPage` | number | `1` | First page number |
| `pageSize` | number | `10` | Items per page |
| `pageKey` | string | `"page"` | Query param name for page |
| `pageSizeKey` | string | `"limit"` | Query param name for size |

```js
import { createPaginator } from "axiomate";
import { api } from "./api.config";

const paginator = createPaginator(api.getProducts, { pageSize: 20 });

// Fetch pages
const page1 = await paginator.next();   // GET /products?page=1&limit=20
const page2 = await paginator.next();   // GET /products?page=2&limit=20
await paginator.goTo(5);                // GET /products?page=5&limit=20
paginator.reset();                      // back to page 1

// Check state
paginator.currentPage   // current page number
paginator.hasMore       // false when last page returned fewer items than pageSize
```

---

### Mock Mode

Develop and test your frontend without a real backend.

```js
const { api, mock } = createApi({ ... });

// Enable mock mode
mock.enable();

// Static mock response
mock.register("getUser", { id: 1, name: "Ali", email: "ali@test.com" });

// Dynamic mock — different responses based on request data
mock.register("login", (data) => {
  if (data.username === "ali") return { token: "fake-token-123" };
  throw new Error("Invalid credentials");
});

// With custom delay (simulates slow network)
mock.register("getProducts", [{ id: 1 }, { id: 2 }], { delay: 1000 });

// Disable when done
mock.disable();
mock.clear(); // remove all registered mocks
```

---

### Cache Control

```js
const { cache } = createApi({ ... });

cache.clear();           // clear all cached responses
cache.clear("/user/5");  // clear one specific entry
cache.size();            // number of cached entries
cache.cleanup();         // remove only expired entries (keep fresh ones)
```

---

### Multiple Backends

Each `createApi` call is fully isolated — different base URLs, different tokens, no conflict.

```js
// Main API
const { api: mainApi } = createApi({
  baseUrl: "http://api.myapp.com",
  getToken: () => localStorage.getItem("token"),
  endpoints: { getUser: { path: "/user/:id", method: "GET" } },
});

// Admin API — completely separate instance
const { api: adminApi } = createApi({
  baseUrl: "http://admin.myapp.com",
  getToken: () => localStorage.getItem("admin-token"),
  endpoints: { getStats: { path: "/stats", method: "GET" } },
});

// Both work independently
await mainApi.getUser({ id: 1 });
await adminApi.getStats();
```

---

### TypeScript

Define response types once, get full type safety everywhere.

```ts
interface User      { id: number; name: string; email: string; }
interface Product   { id: number; name: string; price: number; }
interface LoginResp { token: string; user: User; }

const { api } = createApi<typeof endpoints, {
  login:       LoginResp;
  getUser:     User;
  getProducts: Product[];
}>({
  baseUrl: "http://localhost:8080",
  endpoints: { ... },
});

// Full type safety
const user = await api.getUser({ id: 1 });
user.name;   // ✅ string — autocomplete works
user.xyz;    // ❌ TypeScript error — property does not exist

// Typed React hook
const { data } = useApi<User>(api.getUser);
data?.name;  // ✅ typed as string | null

// Typed paginator
const paginator = createPaginator<Product>(api.getProducts);
const items = await paginator.next();
items[0].price; // ✅ typed as number
```

---

## Comparison

| | Without Axiomate | With Axiomate |
|---|---|---|
| Base URL change | Update 50+ files | Update 1 file |
| Auth token | Attach manually everywhere | Automatic |
| Error handling | Try/catch in every component | One global handler |
| Loading state | Manage manually | `useApi` handles it |
| Find an endpoint | Search the entire codebase | One config file |
| File upload | Write FormData manually | `upload: true` |
| Pagination | Track page number manually | `paginator.next()` |
| Retry logic | Write a while loop | `retry: 3` |
| Multiple backends | Risk of instance conflict | Fully isolated |
| Mock for testing | External library needed | Built-in |

---

## Running Tests

```bash
npm install
npm test
```

---

## License

MIT