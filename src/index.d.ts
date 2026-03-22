// ─── Endpoint Definition ──────────────────────────────────────────────────────

export interface EndpointConfig {
  /** URL path — supports dynamic params like "/user/:id" */
  path: string;
  /** HTTP method (default: "GET") */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Per-endpoint timeout ms — overrides global */
  timeout?: number;
  /** Cache TTL ms — GET requests only */
  cache?: number;
  /** Stale While Revalidate — return stale, refetch in background */
  swr?: boolean;
  /** Retry count on failure (default: 0) */
  retry?: number;
  /** Delay between retries ms (default: 1000) */
  retryDelay?: number;
  /** File upload mode — sends multipart/form-data */
  upload?: boolean;
  /** Deduplicate POST requests too (default: false) */
  dedupePost?: boolean;
}

export interface EndpointsMap {
  [key: string]: EndpointConfig;
}

// ─── API Function ─────────────────────────────────────────────────────────────

export type ApiFunction<TData = any, TParams = Record<string, any>> = (
  data?: TParams,
  extraConfig?: Record<string, any>
) => Promise<TData>;

// ─── createApi Config ─────────────────────────────────────────────────────────

export interface CreateApiConfig<T extends EndpointsMap> {
  /** Backend base URL */
  baseUrl: string;
  /** All endpoints */
  endpoints: T;
  /** Extra default headers */
  headers?: Record<string, string>;
  /** Global timeout ms (default: 10000) */
  timeout?: number;
  /** Auto Bearer token (default: true) */
  autoToken?: boolean;
  /** Custom token getter for THIS instance only */
  getToken?: () => string | null;
  /** Max cache entries (default: 200) */
  maxCacheSize?: number;
  /** Called when SWR background refetch fails */
  onSWRError?: (endpointName: string, error: ApiError) => void;
}

// ─── Typed API Client ─────────────────────────────────────────────────────────

/**
 * Map endpoint names to typed API functions
 * TResponses lets you define return types per endpoint
 *
 * @example
 * interface MyResponses {
 *   login:       { token: string };
 *   getUser:     User;
 *   getProducts: Product[];
 * }
 *
 * const { api } = createApi<typeof endpoints, MyResponses>({ ... });
 * const user = await api.getUser({ id: 1 }); // typed as User
 */
export type ApiClient<
  T extends EndpointsMap,
  TResponses extends Record<string, any> = Record<string, any>
> = {
  [K in keyof T]: ApiFunction<
    K extends keyof TResponses ? TResponses[K] : any
  >;
};

// ─── Mock Store ───────────────────────────────────────────────────────────────

export type MockResponseFn<T = any> = (requestData: any) => T;
export type MockResponse<T = any> = T | MockResponseFn<T>;

export interface MockOptions {
  /** Fake network delay ms (default: 300) */
  delay?: number;
}

export interface MockStore {
  enable: () => void;
  disable: () => void;
  isEnabled: () => boolean;
  register: <T = any>(name: string, response: MockResponse<T>, options?: MockOptions) => void;
  clear: () => void;
}

// ─── Cache Store ──────────────────────────────────────────────────────────────

export interface CacheStore {
  buildKey: (url: string, params?: Record<string, any>) => string;
  get: (key: string) => { data: any } | null;
  getStale: (key: string) => any;
  set: (key: string, data: any, ttl: number) => void;
  clear: (key?: string) => void;
  size: () => number;
  cleanup: () => void;
}

// ─── createApi Return ─────────────────────────────────────────────────────────

export interface CreateApiResult<
  T extends EndpointsMap,
  TResponses extends Record<string, any> = Record<string, any>
> {
  /** All your API functions */
  api: ApiClient<T, TResponses>;
  /** Mock mode controls for this instance */
  mock: MockStore;
  /** Cache controls for this instance */
  cache: CacheStore;
  /** Add request interceptor to THIS instance only */
  addRequestInterceptor: (fn: (config: any) => any) => void;
  /** Add response interceptor to THIS instance only */
  addResponseInterceptor: (fn: (response: any) => any) => void;
  /** Add error interceptor to THIS instance only */
  addErrorInterceptor: (fn: (error: ApiError) => void) => void;
  /** Cleanup — clears cache, pending requests, interceptors */
  destroy: () => void;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export interface ApiError extends Error {
  status?: number;
  data?: any;
  original?: any;
}

// ─── useApi Hook ──────────────────────────────────────────────────────────────

export interface UseApiOptions<TParams = Record<string, any>> {
  params?: TParams;
  immediate?: boolean;
  initialData?: any;
}

export interface OptimisticOptions<TData = any> {
  /** Show this data instantly before server responds */
  optimisticData: TData;
  /** Rollback to this if request fails */
  rollbackData: TData;
}

export interface UseApiResult<TData = any> {
  data: TData | null;
  loading: boolean;
  error: ApiError | null;
  execute: (
    overrideParams?: Record<string, any>,
    optimisticOptions?: OptimisticOptions<TData>
  ) => Promise<TData>;
  reset: () => void;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatorOptions {
  startPage?: number;
  pageSize?: number;
  pageKey?: string;
  pageSizeKey?: string;
}

export interface Paginator<TData = any> {
  next: (extraParams?: Record<string, any>) => Promise<TData>;
  goTo: (page: number, extraParams?: Record<string, any>) => Promise<TData>;
  reset: () => void;
  readonly currentPage: number;
  readonly hasMore: boolean;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * createApi — core function
 * Returns isolated instance — safe to call multiple times for different backends
 *
 * @example
 * const { api, mock, cache } = createApi<typeof endpoints, {
 *   login: { token: string };
 *   getUser: User;
 * }>({
 *   baseUrl: "http://localhost:8080",
 *   endpoints: { ... }
 * });
 */
export declare function createApi<
  T extends EndpointsMap,
  TResponses extends Record<string, any> = Record<string, any>
>(config: CreateApiConfig<T>): CreateApiResult<T, TResponses>;

/**
 * Global interceptors — apply to ALL createApi instances
 * For instance-specific interceptors, use the ones returned by createApi()
 */
export declare function addRequestInterceptor(fn: (config: any) => any): void;
export declare function addResponseInterceptor(fn: (response: any) => any): void;
export declare function addErrorInterceptor(fn: (error: ApiError) => void): void;
export declare function clearInterceptors(): void;

/**
 * useApi — React hook
 *
 * @example
 * const { data, loading, error } = useApi<User>(api.getUser);
 * const { execute } = useApi<LoginResponse>(api.login, { immediate: false });
 */
export declare function useApi<TData = any, TParams = Record<string, any>>(
  apiFn: ApiFunction<TData, TParams>,
  options?: UseApiOptions<TParams>
): UseApiResult<TData>;

/**
 * createPaginator — paginate any list endpoint
 *
 * @example
 * const paginator = createPaginator<Product>(api.getProducts, { pageSize: 20 });
 * const items = await paginator.next();
 */
export declare function createPaginator<TItem = any>(
  apiFn: ApiFunction<TItem[]>,
  options?: PaginatorOptions
): Paginator<TItem[]>;
