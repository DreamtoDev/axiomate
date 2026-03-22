/**
 * axiomate v4
 * Zero-boilerplate API client — production-ready
 */

const { createApi } = require("./createApi");
const { addRequestInterceptor,
        addResponseInterceptor,
        addErrorInterceptor,
        clearInterceptors } = require("./interceptors");
const { useApi } = require("./useApi");
const { createPaginator } = require("./pagination");

module.exports = {
  createApi,
  addRequestInterceptor,
  addResponseInterceptor,
  addErrorInterceptor,
  clearInterceptors,
  useApi,
  createPaginator,
};
