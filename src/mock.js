/**
 * mock.js
 * Per-instance mock mode — no global state
 */

const createMockStore = () => {
  const mocks = new Map();
  let enabled = false;

  const enable = () => {
    enabled = true;
    console.info("[axiomate] Mock mode enabled.");
  };

  const disable = () => {
    enabled = false;
    console.info("[axiomate] Mock mode disabled.");
  };

  const isEnabled = () => enabled;

  /**
   * Register a mock response for an endpoint
   *
   * @param {string}          name      - Endpoint name e.g. "login"
   * @param {any|Function}    response  - Static data or function(requestData) => data
   * @param {Object}          options
   * @param {number}          options.delay  - Fake delay in ms (default: 300)
   *
   * @example
   * mock.register("getUser", { id: 1, name: "Ali" });
   * mock.register("login", (data) => {
   *   if (data.username === "ali") return { token: "abc" };
   *   throw new Error("Invalid credentials");
   * });
   */
  const register = (name, response, options = {}) => {
    const { delay = 300 } = options;
    mocks.set(name, { response, delay });
  };

  const get = (name) => mocks.get(name);

  const clear = () => mocks.clear();

  return { enable, disable, isEnabled, register, get, clear };
};

module.exports = { createMockStore };
