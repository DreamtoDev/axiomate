/**
 * ─────────────────────────────────────────────────────────────
 * axiomate v4 — Real world usage examples
 * ─────────────────────────────────────────────────────────────
 */

import {
  createApi,
  addErrorInterceptor,
  useApi,
  createPaginator,
} from "axiomate";

// ─── TypeScript: Define your response types ───────────────────────────────────
// (Skip this section if using plain JavaScript)

interface User       { id: number; name: string; email: string; }
interface Product    { id: number; name: string; price: number; }
interface LoginResp  { token: string; user: User; }

// ─── STEP 1: Global error handler (once in index.js / App.js) ────────────────

addErrorInterceptor((error) => {
  if (error.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }
});

// ─── STEP 2: Create your API (one file — api.config.js) ──────────────────────

const { api, mock, cache } = createApi<typeof endpoints, {
  login:        LoginResp;
  getUser:      User;
  getProducts:  Product[];
  uploadAvatar: { url: string };
}>({
  baseUrl: "http://localhost:8080",
  getToken: () => localStorage.getItem("token"), // instance-level token

  // SWR errors go here instead of silent console.warn
  onSWRError: (name, err) => console.error(`SWR failed for ${name}:`, err.message),

  endpoints: {
    // Auth
    login:         { path: "/auth/login",     method: "POST" },
    logout:        { path: "/auth/logout",     method: "POST" },

    // User — dynamic param + cache
    getUser:       { path: "/user/:id",        method: "GET",  cache: 60000 },

    // Dashboard — SWR (show stale, refresh in background)
    getDashboard:  { path: "/dashboard",       method: "GET",  cache: 30000, swr: true },

    // Products — paginated + cache
    getProducts:   { path: "/products",        method: "GET",  cache: 60000 },

    // Stats — retry 3 times if server is flaky
    getStats:      { path: "/stats",           method: "GET",  retry: 3, retryDelay: 2000 },

    // Heavy report — custom timeout
    getReport:     { path: "/report/full",     method: "GET",  timeout: 60000 },

    // File upload
    uploadAvatar:  { path: "/user/avatar",     method: "POST", upload: true },

    // Prevent double submit on payment
    createPayment: { path: "/payment",         method: "POST", dedupePost: true },
  },
});

// ─── STEP 3: Use anywhere ─────────────────────────────────────────────────────

// Simple async/await
const res = await api.login({ username: "ali", password: "1234" });
localStorage.setItem("token", res.token);

// Dynamic URL param → GET /user/5
const user = await api.getUser({ id: 5 });

// File upload
await api.uploadAvatar({ avatar: fileInput.files[0], userId: 5 });

// Deduplicated — even if called 10 times simultaneously, only 1 network request
await Promise.all([api.getUser({ id: 5 }), api.getUser({ id: 5 })]);


// ─── STEP 4: React Hook ───────────────────────────────────────────────────────

// Auto call on mount — typed as User
function ProfilePage() {
  const { data: user, loading, error } = useApi<User>(api.getUser, {
    params: { id: 5 },
  });

  if (loading) return <p>Loading...</p>;
  if (error)   return <p>{error.message}</p>;
  return <h1>Hello, {user.name}</h1>;
}

// Manual call — form submit
function LoginPage() {
  const { loading, error, execute: doLogin } = useApi<LoginResp>(api.login, {
    immediate: false,
  });

  const handleSubmit = async () => {
    const res = await doLogin({ username, password });
    localStorage.setItem("token", res.token);
  };

  return (
    <button onClick={handleSubmit} disabled={loading}>
      {loading ? "Logging in..." : "Login"}
    </button>
  );
}

// Optimistic update — UI updates instantly, rollback on failure
function EditProfile({ user }) {
  const { execute } = useApi(api.updateUser, { immediate: false });

  const handleSave = async (newName) => {
    await execute(
      { id: user.id, name: newName },
      {
        optimisticData: { ...user, name: newName }, // show instantly
        rollbackData: user,                          // revert if fails
      }
    );
  };
}


// ─── STEP 5: Pagination ───────────────────────────────────────────────────────

const paginator = createPaginator<Product>(api.getProducts, { pageSize: 20 });

function ProductList() {
  const [items, setItems] = useState([]);

  const loadMore = async () => {
    if (!paginator.hasMore) return;
    const newItems = await paginator.next();
    setItems((prev) => [...prev, ...newItems]);
  };

  return (
    <div>
      {items.map((p) => <div key={p.id}>{p.name}</div>)}
      {paginator.hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}


// ─── STEP 6: Multiple backends — no conflict! ─────────────────────────────────

const { api: mainApi } = createApi({
  baseUrl: "http://api.myapp.com",
  getToken: () => localStorage.getItem("token"),
  endpoints: { getUser: { path: "/user/:id", method: "GET" } },
});

const { api: adminApi } = createApi({
  baseUrl: "http://admin.myapp.com",
  getToken: () => localStorage.getItem("admin-token"), // different token!
  endpoints: { getStats: { path: "/stats", method: "GET" } },
});

// Both work independently — no instance conflicts
await mainApi.getUser({ id: 1 });
await adminApi.getStats();


// ─── STEP 7: Mock mode — develop without backend ─────────────────────────────

if (process.env.NODE_ENV === "development") {
  mock.enable();

  mock.register("getUser", { id: 1, name: "Ali", email: "ali@test.com" });
  mock.register("getProducts", [
    { id: 1, name: "Phone", price: 999 },
    { id: 2, name: "Laptop", price: 1999 },
  ]);
  mock.register("login", (data) => {
    if (data.username === "ali") return { token: "dev-token-123" };
    throw new Error("Invalid credentials");
  });
}


// ─── STEP 8: Cache control ────────────────────────────────────────────────────

cache.clear();                    // clear everything
cache.clear("/products");         // clear specific key
console.log(cache.size());        // how many cached entries
cache.cleanup();                  // remove only expired entries
