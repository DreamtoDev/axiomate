/**
 * cache.js
 * In-memory cache with TTL, SWR support, max size, and auto cleanup
 */

const DEFAULT_MAX_SIZE = 200; // max cache entries

const createCache = (maxSize = DEFAULT_MAX_SIZE) => {
  const _cache = new Map();

  /**
   * Build unique cache key from url + params
   */
  const buildKey = (url, params = {}) => {
    const paramStr = Object.keys(params).length
      ? "?" + new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        ).toString()
      : "";
    return `${url}${paramStr}`;
  };

  /**
   * Evict oldest entry when cache is full
   */
  const evictOldest = () => {
    const firstKey = _cache.keys().next().value;
    if (firstKey) _cache.delete(firstKey);
  };

  /**
   * Remove all expired entries
   */
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of _cache.entries()) {
      if (now > entry.expiresAt) _cache.delete(key);
    }
  };

  /**
   * Get fresh cached data — returns { data } or null if expired/missing
   */
  const get = (key) => {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      _cache.delete(key);
      return null;
    }
    return { data: entry.data };
  };

  /**
   * Get data even if stale (for SWR pattern)
   */
  const getStale = (key) => {
    const entry = _cache.get(key);
    return entry ? entry.data : null;
  };

  /**
   * Check if entry is expired (for SWR — exists but stale)
   */
  const isExpired = (key) => {
    const entry = _cache.get(key);
    if (!entry) return true;
    return Date.now() > entry.expiresAt;
  };

  /**
   * Store value with TTL
   */
  const set = (key, data, ttl) => {
    // Auto cleanup if at max size
    if (_cache.size >= maxSize) {
      cleanup();
      if (_cache.size >= maxSize) evictOldest();
    }
    _cache.set(key, { data, expiresAt: Date.now() + ttl, cachedAt: Date.now() });
  };

  /**
   * Clear specific key or entire cache
   */
  const clear = (key) => {
    if (key) _cache.delete(key);
    else _cache.clear();
  };

  const size = () => _cache.size;

  return { buildKey, get, getStale, isExpired, set, clear, size, cleanup };
};

module.exports = { createCache };
