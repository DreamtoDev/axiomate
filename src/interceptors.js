/**
 * interceptors.js
 * GLOBAL interceptors — apply to ALL createApi instances
 * For instance-specific interceptors, use the returned addRequestInterceptor from createApi
 */

const { _globalInterceptors } = require("./_store");

/**
 * addRequestInterceptor — runs before every request on ALL instances
 * @param {Function} fn - (config) => config
 *
 * @example
 * addRequestInterceptor((config) => {
 *   config.headers["X-App-Version"] = "4.0.0";
 *   return config;
 * });
 */
const addRequestInterceptor = (fn) => _globalInterceptors.request.push(fn);

/**
 * addResponseInterceptor — runs after every successful response on ALL instances
 * @param {Function} fn - (response) => response
 */
const addResponseInterceptor = (fn) => _globalInterceptors.response.push(fn);

/**
 * addErrorInterceptor — runs when any request fails on ALL instances
 * @param {Function} fn - (error) => void
 *
 * @example
 * addErrorInterceptor((error) => {
 *   if (error.status === 401) window.location.href = "/login";
 * });
 */
const addErrorInterceptor = (fn) => _globalInterceptors.error.push(fn);

/**
 * clearInterceptors — remove all global interceptors
 */
const clearInterceptors = () => {
  _globalInterceptors.request  = [];
  _globalInterceptors.response = [];
  _globalInterceptors.error    = [];
};

module.exports = { addRequestInterceptor, addResponseInterceptor, addErrorInterceptor, clearInterceptors };
