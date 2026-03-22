const { addRequestInterceptor, addResponseInterceptor, addErrorInterceptor, clearInterceptors } = require("../src/interceptors");
const { _globalStore } = require("../src/_store");

beforeEach(() => clearInterceptors());

describe("interceptors", () => {
  test("addRequestInterceptor adds to store", () => {
    const fn = (cfg) => cfg;
    addRequestInterceptor(fn);
    expect(_globalStore.interceptors.request).toContain(fn);
  });

  test("addResponseInterceptor adds to store", () => {
    const fn = (res) => res;
    addResponseInterceptor(fn);
    expect(_globalStore.interceptors.response).toContain(fn);
  });

  test("addErrorInterceptor adds to store", () => {
    const fn = (err) => {};
    addErrorInterceptor(fn);
    expect(_globalStore.interceptors.error).toContain(fn);
  });

  test("clearInterceptors removes all", () => {
    addRequestInterceptor((c) => c);
    addResponseInterceptor((r) => r);
    addErrorInterceptor((e) => {});
    clearInterceptors();
    expect(_globalStore.interceptors.request.length).toBe(0);
    expect(_globalStore.interceptors.response.length).toBe(0);
    expect(_globalStore.interceptors.error.length).toBe(0);
  });

  test("multiple interceptors all registered", () => {
    addRequestInterceptor((c) => c);
    addRequestInterceptor((c) => c);
    addRequestInterceptor((c) => c);
    expect(_globalStore.interceptors.request.length).toBe(3);
  });
});
