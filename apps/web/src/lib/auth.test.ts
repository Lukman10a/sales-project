import { describe, it, expect, beforeEach, vi } from "vitest";

const authApi = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
}));

const tokens = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  isTokenExpired: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({ authApi }));
vi.mock("@/lib/api/tokens", () => tokens);

import { AuthService, landingPathFor } from "@/lib/auth";
import type { User } from "@/lib/auth";

const backendUser = {
  id: "u1",
  email: "owner@luxa.com",
  firstName: "Ada",
  lastName: "Lovelace",
  businessName: "LUXA",
  businessId: "b1",
  role: "owner",
  avatar: "",
};

const authResponse = {
  user: backendUser,
  access_token: "at",
  refresh_token: "rt",
};

describe("AuthService", () => {
  beforeEach(() => {
    authApi.login.mockReset();
    authApi.register.mockReset();
    authApi.logout.mockReset();
    authApi.getMe.mockReset();
    tokens.setTokens.mockReset();
    tokens.clearTokens.mockReset();
    tokens.getAccessToken.mockReset();
    tokens.getAccessToken.mockReturnValue(null);
    localStorage.clear();
    document.cookie = "";
  });

  it("login calls the api without role and stores tokens + cookie", async () => {
    authApi.login.mockResolvedValue(authResponse);

    const user = await AuthService.login({
      email: "owner@luxa.com",
      password: "Password1",
      role: "owner",
    });

    expect(authApi.login).toHaveBeenCalledWith("owner@luxa.com", "Password1");
    expect(tokens.setTokens).toHaveBeenCalledWith("at", "rt");
    expect(user).toMatchObject({ role: "owner", firstName: "Ada" });
    expect(document.cookie).toContain("luxa_auth=1");
    expect(localStorage.getItem("luxa_auth_user")).toBeNull();
  });

  it("register calls the api without role and stores tokens + cookie", async () => {
    authApi.register.mockResolvedValue(authResponse);

    const user = await AuthService.register({
      email: "owner@luxa.com",
      password: "Password1",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "owner",
      businessName: "LUXA",
    });

    expect(authApi.register).toHaveBeenCalledWith({
      email: "owner@luxa.com",
      password: "Password1",
      firstName: "Ada",
      lastName: "Lovelace",
      businessName: "LUXA",
    });
    expect(tokens.setTokens).toHaveBeenCalledWith("at", "rt");
    expect(user).toMatchObject({ role: "owner", firstName: "Ada" });
    expect(document.cookie).toContain("luxa_auth=1");
  });

  it("aborts an investor login attempt before calling the api", async () => {
    await expect(
      AuthService.login({
        email: "fatima@investor.com",
        password: "Password1",
        role: "investor",
      }),
    ).rejects.toThrow("Investor portal is coming soon");
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("logout clears tokens and the cookie", async () => {
    authApi.logout.mockResolvedValue({ message: "Logged out successfully" });
    document.cookie = "luxa_auth=1; path=/";

    await AuthService.logout();

    expect(authApi.logout).toHaveBeenCalled();
    expect(tokens.clearTokens).toHaveBeenCalled();
    expect(document.cookie).not.toContain("luxa_auth");
  });

  it("getCurrentUser returns null when no access token exists", async () => {
    tokens.getAccessToken.mockReturnValue(null);
    await expect(AuthService.getCurrentUser()).resolves.toBeNull();
    expect(authApi.getMe).not.toHaveBeenCalled();
  });

  it("landingPathFor sends owner/manager to /dashboard and apprentices to an allowed page", () => {
    const manager = {
      ...backendUser,
      role: "apprentice",
      staffRole: "manager",
    } as User;
    const owner = { ...backendUser, role: "owner" } as User;
    const salesApprentice = {
      ...backendUser,
      role: "apprentice",
      staffRole: "sales-assistant",
    } as User;
    const inventoryApprentice = {
      ...backendUser,
      role: "apprentice",
      staffRole: "inventory",
    } as User;
    const bareApprentice = { ...backendUser, role: "apprentice" } as User;

    expect(landingPathFor(manager)).toBe("/dashboard");
    expect(landingPathFor(owner)).toBe("/dashboard");
    expect(landingPathFor(salesApprentice)).toBe("/sales");
    expect(landingPathFor(inventoryApprentice)).toBe("/inventory");
    expect(landingPathFor(bareApprentice)).toBe("/notifications");
  });

  it("login surfaces the backend permission array on the mapped user", async () => {
    authApi.login.mockResolvedValue({
      ...authResponse,
      user: {
        ...backendUser,
        role: "manager",
        permissions: ["record-sales", "view-inventory"],
      },
    });

    const user = await AuthService.login({
      email: "mgr@luxa.com",
      password: "Password1",
      role: "apprentice",
    });

    expect(user).toMatchObject({
      role: "apprentice",
      staffRole: "manager",
      permissions: ["record-sales", "view-inventory"],
    });
  });
});