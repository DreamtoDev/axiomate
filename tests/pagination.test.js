const { createPaginator } = require("../src/pagination");

describe("createPaginator", () => {
  test("next() sends correct page and limit", async () => {
    const fn = jest.fn().mockResolvedValue([1, 2, 3, 4, 5]);
    const p = createPaginator(fn, { pageSize: 5 });

    await p.next();
    expect(fn).toHaveBeenCalledWith({ page: 1, limit: 5 });

    await p.next();
    expect(fn).toHaveBeenCalledWith({ page: 2, limit: 5 });
  });

  test("goTo() jumps to specific page", async () => {
    const fn = jest.fn().mockResolvedValue([]);
    const p = createPaginator(fn);
    await p.goTo(4);
    expect(fn).toHaveBeenCalledWith({ page: 4, limit: 10 });
  });

  test("reset() goes back to page 1", async () => {
    const fn = jest.fn().mockResolvedValue([1, 2, 3]);
    const p = createPaginator(fn);
    await p.next(); // page 1
    await p.next(); // page 2
    p.reset();
    await p.next(); // page 1 again
    expect(fn).toHaveBeenLastCalledWith({ page: 1, limit: 10 });
  });

  test("hasMore becomes false when response shorter than pageSize", async () => {
    const fn = jest.fn().mockResolvedValue([1, 2]); // 2 < pageSize 10
    const p = createPaginator(fn);
    await p.next();
    expect(p.hasMore).toBe(false);
  });

  test("hasMore stays true when response equals pageSize", async () => {
    const fn = jest.fn().mockResolvedValue([1, 2, 3, 4, 5]);
    const p = createPaginator(fn, { pageSize: 5 });
    await p.next();
    expect(p.hasMore).toBe(true);
  });

  test("custom pageKey and pageSizeKey", async () => {
    const fn = jest.fn().mockResolvedValue([]);
    const p = createPaginator(fn, { pageKey: "pageNum", pageSizeKey: "perPage", pageSize: 20 });
    await p.next();
    expect(fn).toHaveBeenCalledWith({ pageNum: 1, perPage: 20 });
  });

  test("extra params passed to apiFn", async () => {
    const fn = jest.fn().mockResolvedValue([]);
    const p = createPaginator(fn);
    await p.next({ category: "phones" });
    expect(fn).toHaveBeenCalledWith({ page: 1, limit: 10, category: "phones" });
  });

  test("currentPage increments after next()", async () => {
    const fn = jest.fn().mockResolvedValue([1]);
    const p = createPaginator(fn);
    expect(p.currentPage).toBe(1);
    await p.next();
    expect(p.currentPage).toBe(2);
  });
});
