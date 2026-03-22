const axios = require("axios");
const { createStore, _globalInterceptors } = require("./_store");
const { createCache } = require("./cache");
const { createMockStore } = require("./mock");

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Resolve "/user/:id" + { id: 5 } → { path: "/user/5", remaining: {} }
 */
const resolvePath = (path, data) => {
  let resolvedPath = path;
  const usedKeys = [];
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];

  for (const match of matches) {
    const key = match.slice(1);
    if (data[key] !== undefined) {
      resolvedPath = resolvedPath.replace(match, encodeURIComponent(String(data[key])));
      usedKeys.push(key);
    } else {
      console.warn(`[axiomate] URL param "${key}" not provided for path "${path}"`);
    }
  }

  const remaining = { ...data };
  usedKeys.forEach((k) => delete remaining[k]);
  return { resolvedPath, remaining };
};

/**
 * createApi — core function
 * Each call creates a completely ISOLATED instance — safe for multiple APIs
 *
 * @param {Object}  config
 * @param {string}  config.baseUrl          - Backend base URL
 * @param {Object}  config.endpoints        - Endpoints map
 * @param {Object}  [config.headers]        - Extra default headers
 * @param {number}  [config.timeout]        - Global timeout ms (default: 10000)
 * @param {boolean} [config.autoToken]      - Auto Bearer token (default: true)
 * @param {Function}[config.getToken]       - Custom token getter for THIS instance
 * @param {number}  [config.maxCacheSize]   - Max cache entries (default: 200)
 * @param {Function}[config.onSWRError]     - Called when background SWR refetch fails
 *
 * Endpoint options:
 * @param {string}  endpoint.path           - URL, supports ":param" syntax
 * @param {string}  endpoint.method         - HTTP method (default: "GET")
 * @param {number}  endpoint.timeout        - Per-endpoint timeout override
 * @param {number}  endpoint.cache          - Cache TTL ms (GET only)
 * @param {boolean} endpoint.swr            - Stale While Revalidate
 * @param {number}  endpoint.retry          - Retry count on failure (default: 0)
 * @param {number}  endpoint.retryDelay     - Delay between retries ms (default: 1000)
 * @param {boolean} endpoint.upload         - File upload mode (multipart/form-data)
 * @param {boolean} endpoint.dedupePost     - Deduplicate POST requests too (default: false)
 *
 * @returns {{ api, mock, cache, destroy }}
 *
 * @example
 * const { api, mock, cache } = createApi({
 *   baseUrl: "http://localhost:8080",
 *   endpoints: {
 *     login:        { path: "/auth/login",   method: "POST" },
 *     getUser:      { path: "/user/:id",     method: "GET",  cache: 60000 },
 *     getDashboard: { path: "/dashboard",    method: "GET",  cache: 30000, swr: true },
 *     getStats:     { path: "/stats",        method: "GET",  retry: 3 },
 *     uploadPhoto:  { path: "/user/avatar",  method: "POST", upload: true },
 *   }
 * });
 *
 * await api.login({ username: "ali", password: "1234" });
 * await api.getUser({ id: 5 }); // → GET /user/5
 *
 * // Multiple APIs — no conflict!
 * const { api: adminApi } = createApi({ baseUrl: "http://admin.api.com", endpoints: {...} });
 */
const createApi = (config) => {
  const {
    baseUrl,
    endpoints = {},
    headers = {},
    timeout = 10000,
    autoToken = true,
    getToken,
    maxCacheSize = 200,
    onSWRError = null,
  } = config;

  if (!baseUrl) throw new Error("[axiomate] baseUrl is required.");
  if (!Object.keys(endpoints).length) console.warn("[axiomate] No endpoints defined.");

  // ── Each createApi gets its OWN isolated store ─────────────────────────────
  const store    = createStore();
  const cache    = createCache(maxCacheSize);
  const mock     = createMockStore();

  // Token getter — instance-level takes priority over global
  const _resolveToken = getToken || (() => {
    try { return localStorage.getItem("token"); } catch { return null; }
  });

  // ── Axios instance (isolated per createApi call) ───────────────────────────
  store.instance = axios.create({
    baseURL: baseUrl,
    timeout,
    headers: { "Content-Type": "application/json", ...headers },
  });

  // ── Request interceptor ────────────────────────────────────────────────────
  store.instance.interceptors.request.use(
    (axiosConfig) => {
      if (autoToken) {
        const token = _resolveToken();
        if (token) axiosConfig.headers["Authorization"] = `Bearer ${token}`;
      }
      // Run instance-level interceptors, then global
      const allRequest = [...store.interceptors.request, ..._globalInterceptors.request];
      let cfg = axiosConfig;
      for (const fn of allRequest) cfg = fn(cfg) || cfg;
      return cfg;
    },
    (err) => Promise.reject(err)
  );

  // ── Response interceptor ───────────────────────────────────────────────────
  store.instance.interceptors.response.use(
    (response) => {
      const allResponse = [...store.interceptors.response, ..._globalInterceptors.response];
      let res = response;
      for (const fn of allResponse) res = fn(res) || res;
      return res;
    },
    (error) => {
      const allError = [...store.interceptors.error, ..._globalInterceptors.error];
      for (const fn of allError) fn(error);

      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong";

      const err = new Error(message);
      err.status = status;
      err.data   = error?.response?.data;
      err.original = error;
      return Promise.reject(err);
    }
  );

  // ── Core request executor ──────────────────────────────────────────────────
  const executeRequest = async ({ resolvedPath, remaining, upperMethod, upload, endpointTimeout, extraConfig }) => {
    const reqConfig = {
      method: upperMethod,
      url: resolvedPath,
      ...(endpointTimeout && { timeout: endpointTimeout }),
      ...extraConfig,
    };

    if (upload) {
      const formData = new FormData();
      for (const [k, v] of Object.entries(remaining)) formData.append(k, v);
      reqConfig.data = formData;
      reqConfig.headers = { ...reqConfig.headers, "Content-Type": "multipart/form-data" };
    } else if (upperMethod === "GET" || upperMethod === "DELETE") {
      reqConfig.params = remaining;
    } else {
      reqConfig.data = remaining;
    }

    const response = await store.instance(reqConfig);
    return response.data;
  };

  // ── Build endpoint functions ───────────────────────────────────────────────
  const api = {};

  for (const [name, endpoint] of Object.entries(endpoints)) {
    const {
      path,
      method      = "GET",
      timeout: endpointTimeout,
      cache: cacheTTL,
      swr         = false,
      retry       = 0,
      retryDelay  = 1000,
      upload      = false,
      dedupePost  = false,
    } = endpoint;

    if (!path) {
      console.warn(`[axiomate] Endpoint "${name}" has no path. Skipping.`);
      continue;
    }

    api[name] = async (data = {}, extraConfig = {}) => {
      const upperMethod = method.toUpperCase();

      // ── Mock mode ────────────────────────────────────────────────────────
      if (mock.isEnabled()) {
        const m = mock.get(name);
        if (m) {
          await sleep(m.delay);
          return typeof m.response === "function" ? m.response(data) : m.response;
        }
      }

      // ── Resolve dynamic URL params ────────────────────────────────────
      const { resolvedPath, remaining } = resolvePath(path, data);
      const cacheKey = cache.buildKey(resolvedPath, remaining);

      // ── SWR — Stale While Revalidate ──────────────────────────────────
      if (swr && cacheTTL && upperMethod === "GET") {
        const fresh = cache.get(cacheKey);
        if (fresh) return fresh.data;

        const stale = cache.getStale(cacheKey);
        if (stale) {
          // Return stale instantly, refetch silently in background
          setTimeout(async () => {
            try {
              const result = await executeRequest({ resolvedPath, remaining, upperMethod, upload, endpointTimeout, extraConfig });
              cache.set(cacheKey, result, cacheTTL);
            } catch (err) {
              // SWR background error — notify developer if handler provided
              if (typeof onSWRError === "function") onSWRError(name, err);
              else console.warn(`[axiomate] SWR background refetch failed for "${name}":`, err.message);
            }
          }, 0);
          return stale;
        }
      }

      // ── Normal cache ─────────────────────────────────────────────────
      if (cacheTTL && upperMethod === "GET" && !swr) {
        const cached = cache.get(cacheKey);
        if (cached) return cached.data;
      }

      // ── Request deduplication ─────────────────────────────────────────
      // GET always deduped, POST only if dedupePost: true
      const shouldDedupe = upperMethod === "GET" || (upperMethod === "POST" && dedupePost);
      if (shouldDedupe && store.pendingRequests.has(cacheKey)) {
        return store.pendingRequests.get(cacheKey);
      }

      // ── Execute with retry ────────────────────────────────────────────
      const requestPromise = (async () => {
        let lastError;
        const attempts = retry + 1;

        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            const result = await executeRequest({ resolvedPath, remaining, upperMethod, upload, endpointTimeout, extraConfig });
            if (cacheTTL && upperMethod === "GET") cache.set(cacheKey, result, cacheTTL);
            return result;
          } catch (err) {
            lastError = err;
            if (attempt < attempts) {
              console.warn(`[axiomate] "${name}" failed (attempt ${attempt}/${attempts}). Retrying in ${retryDelay}ms...`);
              await sleep(retryDelay);
            }
          }
        }
        throw lastError;
      })();

      // Store pending promise for deduplication
      if (shouldDedupe) {
        store.pendingRequests.set(cacheKey, requestPromise);
        requestPromise.finally(() => store.pendingRequests.delete(cacheKey));
      }

      return requestPromise;
    };
  }

  // ── Instance-level interceptor adders ─────────────────────────────────────
  const addRequestInterceptor  = (fn) => store.interceptors.request.push(fn);
  const addResponseInterceptor = (fn) => store.interceptors.response.push(fn);
  const addErrorInterceptor    = (fn) => store.interceptors.error.push(fn);

  // ── Destroy — cleanup memory ───────────────────────────────────────────────
  const destroy = () => {
    cache.clear();
    store.pendingRequests.clear();
    mock.clear();
    mock.disable();
    store.interceptors.request  = [];
    store.interceptors.response = [];
    store.interceptors.error    = [];
  };

  return {
    api,
    mock,
    cache,
    destroy,
    addRequestInterceptor,
    addResponseInterceptor,
    addErrorInterceptor,
  };
};

module.exports = { createApi };
