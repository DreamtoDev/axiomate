const { useState, useEffect, useCallback, useRef } = require("react");

/**
 * useApi — React hook with optimistic update support
 *
 * @param {Function} apiFn          - e.g. api.getUser
 * @param {Object}   [options]
 * @param {any}      [options.params]       - Default params
 * @param {boolean}  [options.immediate]    - Call on mount (default: true)
 * @param {any}      [options.initialData]  - Initial data value
 *
 * @returns {{ data, loading, error, execute, reset }}
 *
 * @example
 * // Auto call on mount
 * const { data, loading, error } = useApi(api.getUser);
 *
 * // Manual call
 * const { execute, loading } = useApi(api.login, { immediate: false });
 * await execute({ username, password });
 *
 * // Optimistic update
 * const { execute } = useApi(api.updateUser, { immediate: false });
 * await execute(
 *   { name: "Ali" },
 *   { optimisticData: { ...user, name: "Ali" }, rollbackData: user }
 * );
 */
const useApi = (apiFn, options = {}) => {
  const { params = {}, immediate = true, initialData = null } = options;

  const [data,    setData]    = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error,   setError]   = useState(null);

  // Keep latest params without re-creating execute
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // Keep mounted state to avoid setState on unmounted component
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(
    async (overrideParams = {}, optimisticOptions = {}) => {
      const { optimisticData, rollbackData } = optimisticOptions;

      // Apply optimistic data instantly
      if (optimisticData !== undefined && mountedRef.current) {
        setData(optimisticData);
      }

      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const merged = { ...paramsRef.current, ...overrideParams };
        const result = await apiFn(merged);
        if (mountedRef.current) setData(result);
        return result;
      } catch (err) {
        // Rollback optimistic update on failure
        if (rollbackData !== undefined && mountedRef.current) setData(rollbackData);
        if (mountedRef.current) setError(err);
        throw err;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [apiFn]
  );

  const reset = useCallback(() => {
    if (mountedRef.current) {
      setData(initialData);
      setError(null);
      setLoading(false);
    }
  }, [initialData]);

  useEffect(() => {
    if (immediate) execute();
  }, []); // eslint-disable-line

  return { data, loading, error, execute, reset };
};

module.exports = { useApi };
