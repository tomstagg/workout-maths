import { describe, it, expect, beforeEach } from "vitest";
import { getToken, setToken, clearToken, isLoggedIn } from "../auth";

beforeEach(() => {
  localStorage.clear();
});

describe("token management", () => {
  it("setToken writes to localStorage", () => {
    setToken("my-jwt");
    expect(localStorage.getItem("token")).toBe("my-jwt");
  });

  it("getToken reads back the stored token", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");
  });

  it("getToken returns null when no token is set", () => {
    expect(getToken()).toBeNull();
  });

  it("clearToken removes the token", () => {
    setToken("some-token");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("isLoggedIn returns true when token is present", () => {
    setToken("valid-token");
    expect(isLoggedIn()).toBe(true);
  });

  it("isLoggedIn returns false when no token is present", () => {
    expect(isLoggedIn()).toBe(false);
  });

  it("isLoggedIn returns false after clearToken", () => {
    setToken("token");
    clearToken();
    expect(isLoggedIn()).toBe(false);
  });
});
