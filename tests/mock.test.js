const { createMockStore } = require("../src/mock");

describe("mock store", () => {
  let mock;
  beforeEach(() => { mock = createMockStore(); });

  test("isEnabled is false by default", () => {
    expect(mock.isEnabled()).toBe(false);
  });

  test("enable/disable toggles mock mode", () => {
    const info = jest.spyOn(console, "info").mockImplementation(() => {});
    mock.enable();
    expect(mock.isEnabled()).toBe(true);
    mock.disable();
    expect(mock.isEnabled()).toBe(false);
    info.mockRestore();
  });

  test("register stores mock response", () => {
    mock.register("getUser", { id: 1, name: "Ali" });
    const m = mock.get("getUser");
    expect(m.response).toEqual({ id: 1, name: "Ali" });
    expect(m.delay).toBe(300); // default delay
  });

  test("register with custom delay", () => {
    mock.register("getUser", {}, { delay: 100 });
    expect(mock.get("getUser").delay).toBe(100);
  });

  test("function mock receives request data", () => {
    mock.register("login", (data) => ({ token: `token-for-${data.username}` }));
    const m = mock.get("login");
    const result = m.response({ username: "ali" });
    expect(result.token).toBe("token-for-ali");
  });

  test("clear removes all mocks", () => {
    mock.register("a", {});
    mock.register("b", {});
    mock.clear();
    expect(mock.get("a")).toBeUndefined();
  });

  test("two instances are isolated", () => {
    const mock1 = createMockStore();
    const mock2 = createMockStore();
    const info = jest.spyOn(console, "info").mockImplementation(() => {});
    mock1.enable();
    expect(mock1.isEnabled()).toBe(true);
    expect(mock2.isEnabled()).toBe(false); // completely separate
    info.mockRestore();
  });
});
