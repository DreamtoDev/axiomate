/**
 * _store.js
 * Internal shared state — do not use directly
 * Each createApi() call gets its OWN store — no global state conflicts
 */

const createStore = () => ({
  instance: null,
  interceptors: { request: [], response: [], error: [] },
  pendingRequests: new Map(), // deduplication
});

// Global interceptors shared across all instances
const _globalInterceptors = {
  request: [],
  response: [],
  error: [],
};

module.exports = { createStore, _globalInterceptors };
