import { describe, it, expect, beforeEach } from "vitest";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired,
} from "@/lib/api/tokens";

const ACCESS_KEY = "luxa_access_token";
const REFRESH_KEY = "luxa_refresh_token";

function makeToken(exp?: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify(exp !== undefined ? { exp } : {}));
  return `${header}.${payload}.sig`;
}

describe("tokens", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("setTokens writes both keys and getAccessToken returns the access token", () => {
    setTokens("access-1", "refresh-1");
    expect(localStorage.getItem(ACCESS_KEY)).toBe("access-1");
    expect(localStorage.getItem(REFRESH_KEY)).toBe("refresh-1");
    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
  });

  it("clearTokens removes both keys", () => {
    setTokens("access-1", "refresh-1");
    clearTokens();
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("isTokenExpired is true when exp is in the past", () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(isTokenExpired(makeToken(past))).toBe(true);
  });

  it("isTokenExpired is false when exp is in the future", () => {
    const future = Math.floor(Date.now() / 1000) + 60;
    expect(isTokenExpired(makeToken(future))).toBe(false);
  });

  it("isTokenExpired treats malformed and missing tokens as expired", () => {
    expect(isTokenExpired("not-a-jwt")).toBe(true);
    expect(isTokenExpired("")).toBe(true);
    expect(isTokenExpired(undefined)).toBe(true);
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired(makeToken())).toBe(true);
  });
});