/**
 * pagination.js
 * Paginator helper — next, goTo, reset, hasMore
 */

/**
 * createPaginator
 *
 * @param {Function} apiFn        - e.g. api.getProducts
 * @param {Object}   [options]
 * @param {number}   [options.startPage=1]
 * @param {number}   [options.pageSize=10]
 * @param {string}   [options.pageKey="page"]
 * @param {string}   [options.pageSizeKey="limit"]
 *
 * @example
 * const paginator = createPaginator(api.getProducts, { pageSize: 20 });
 *
 * const items = await paginator.next();     // page 1
 * const more  = await paginator.next();     // page 2
 * await paginator.goTo(5);                  // page 5
 * paginator.reset();                        // back to page 1
 * console.log(paginator.hasMore);           // false if last page was short
 */
const createPaginator = (apiFn, options = {}) => {
  const {
    startPage    = 1,
    pageSize     = 10,
    pageKey      = "page",
    pageSizeKey  = "limit",
  } = options;

  let currentPage = startPage;
  let hasMore     = true;

  return {
    next: async (extraParams = {}) => {
      const data = await apiFn({
        [pageKey]: currentPage,
        [pageSizeKey]: pageSize,
        ...extraParams,
      });

      if (Array.isArray(data) && data.length < pageSize) hasMore = false;
      currentPage++;
      return data;
    },

    goTo: async (page, extraParams = {}) => {
      currentPage = page;
      const data = await apiFn({
        [pageKey]: currentPage,
        [pageSizeKey]: pageSize,
        ...extraParams,
      });
      currentPage++;
      return data;
    },

    reset: () => {
      currentPage = startPage;
      hasMore     = true;
    },

    get currentPage() { return currentPage; },
    get hasMore()     { return hasMore; },
  };
};

module.exports = { createPaginator };
