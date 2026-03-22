const { createCache } = require("../src/cache");

describe("cache", () => {
  let cache;
  beforeEach(() => { cache = createCache(5); }); // max 5 for testing

  test("stores and retrieves data", () => {
    cache.set("key1", { name: "Ali" }, 60000);
    expect(cache.get("key1").data).toEqual({ name: "Ali" });
  });

  test("returns null for expired entry", async () => {
    cache.set("key2", { name: "Ali" }, 1);
    await new Promise((r) => setTimeout(r, 10));
    expect(cache.get("key2")).toBeNull();
  });

  test("getStale returns data even if expired", async () => {
    cache.set("key3", { name: "Ali" }, 1);
    await new Promise((r) => setTimeout(r, 10));
    expect(cache.getStale("key3")).toEqual({ name: "Ali" });
  });

  test("isExpired returns true for expired entry", async () => {
    cache.set("key4", {}, 1);
    await new Promise((r) => setTimeout(r, 10));
    expect(cache.isExpired("key4")).toBe(true);
  });

  test("isExpired returns false for fresh entry", () => {
    cache.set("key5", {}, 60000);
    expect(cache.isExpired("key5")).toBe(false);
  });

  test("clear removes all entries", () => {
    cache.set("a", {}, 60000);
    cache.set("b", {}, 60000);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  test("clear with key removes only that entry", () => {
    cache.set("a", {}, 60000);
    cache.set("b", {}, 60000);
    cache.clear("a");
    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).not.toBeNull();
  });

  test("evicts oldest when max size reached", () => {
    for (let i = 0; i < 5; i++) cache.set(`key${i}`, { i }, 60000);
    expect(cache.size()).toBe(5);
    // Adding one more should evict oldest
    cache.set("key99", {}, 60000);
    expect(cache.size()).toBeLessThanOrEqual(5);
  });

  test("buildKey includes params", () => {
    const k1 = cache.buildKey("/products", { page: "1" });
    const k2 = cache.buildKey("/products", { page: "2" });
    expect(k1).not.toBe(k2);
  });

  test("buildKey with no params is just path", () => {
    expect(cache.buildKey("/products", {})).toBe("/products");
  });

  test("cleanup removes expired entries", async () => {
    cache.set("exp1", {}, 1);
    cache.set("exp2", {}, 1);
    cache.set("fresh", {}, 60000);
    await new Promise((r) => setTimeout(r, 10));
    cache.cleanup();
    expect(cache.get("exp1")).toBeNull();
    expect(cache.get("fresh")).not.toBeNull();
  });
});
