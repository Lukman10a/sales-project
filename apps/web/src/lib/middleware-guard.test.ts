import { describe, it, expect } from "vitest";
import { shouldAllow, isPublicPath, AUTH_COOKIE_NAME } from "@/lib/middleware-guard";

describe("middleware-guard", () => {
  it("allows auth routes without a cookie", () => {
    expect(shouldAllow("/auth/login", false)).toBe(true);
    expect(shouldAllow("/auth/signup", false)).toBe(true);
  });

  it("allows api routes without a cookie", () => {
    expect(shouldAllow("/api/auth/me", false)).toBe(true);
  });

  it("allows the landing page without a cookie", () => {
    expect(shouldAllow("/", false)).toBe(true);
  });

  it("blocks protected routes without the cookie", () => {
    expect(shouldAllow("/dashboard", false)).toBe(false);
    expect(shouldAllow("/sales", false)).toBe(false);
    expect(shouldAllow("/inventory", false)).toBe(false);
  });

  it("allows protected routes when the cookie is present", () => {
    expect(shouldAllow("/dashboard", true)).toBe(true);
  });

  it("treats the cookie name as public-facing", () => {
    expect(AUTH_COOKIE_NAME).toBe("luxa_auth");
    expect(isPublicPath("/auth/login")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
  });
});