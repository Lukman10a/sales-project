import { describe, it, expect, beforeEach, vi } from "vitest";

const authApi = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
}));

const client = vi.hoisted(() => ({ hasSession: vi.fn() }));

vi.mock("@/lib/api/auth", () => ({ authApi }));
vi.mock("@/lib/api/client", () => client);

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

const authResponse = { user: backendUser };

describe("AuthService", () => {
  beforeEach(() => {
    authApi.login.mockReset();
    authApi.register.mockReset();
    authApi.logout.mockReset();
    authApi.getMe.mockReset();
    client.hasSession.mockReset();
    client.hasSession.mockReturnValue(false);
    localStorage.clear();
  });

  it("login calls the api without role and stores nothing in the page", async () => {
    authApi.login.mockResolvedValue(authResponse);

    const user = await AuthService.login({
      email: "owner@luxa.com",
      password: "Password1",
      role: "owner",
    });

    expect(authApi.login).toHaveBeenCalledWith(
      "owner@luxa.com",
      "Password1",
      false,
    );
    expect(user).toMatchObject({ role: "owner", firstName: "Ada" });
    expect(localStorage.length).toBe(0);
    expect(document.cookie).toBe("");
  });

  it("passes 'trust this device' through to the api", async () => {
    authApi.login.mockResolvedValue(authResponse);

    await AuthService.login({
      email: "owner@luxa.com",
      password: "Password1",
      role: "owner",
      remember: true,
    });

    expect(authApi.login).toHaveBeenCalledWith(
      "owner@luxa.com",
      "Password1",
      true,
    );
  });

  it("register calls the api without role", async () => {
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
    expect(user).toMatchObject({ role: "owner", firstName: "Ada" });
    expect(localStorage.length).toBe(0);
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

  it("logout asks the api to revoke the session", async () => {
    authApi.logout.mockResolvedValue({ message: "Logged out successfully" });
    await AuthService.logout();
    expect(authApi.logout).toHaveBeenCalled();
  });

  it("logout resolves even when the session is already gone", async () => {
    authApi.logout.mockRejectedValue(new Error("Unauthorized"));
    await expect(AuthService.logout()).resolves.toBeUndefined();
  });

  it("getCurrentUser loads /auth/me when a session marker exists", async () => {
    client.hasSession.mockReturnValue(true);
    authApi.getMe.mockResolvedValue(backendUser);
    await expect(AuthService.getCurrentUser()).resolves.toMatchObject({
      firstName: "Ada",
    });
  });

  it("getCurrentUser returns null when the api rejects the session", async () => {
    client.hasSession.mockReturnValue(true);
    authApi.getMe.mockRejectedValue(new Error("Unauthorized"));
    await expect(AuthService.getCurrentUser()).resolves.toBeNull();
  });

  it("isAuthenticated reflects the session marker", () => {
    client.hasSession.mockReturnValue(true);
    expect(AuthService.isAuthenticated()).toBe(true);
    client.hasSession.mockReturnValue(false);
    expect(AuthService.isAuthenticated()).toBe(false);
  });

  it("getCurrentUser returns null without a session", async () => {
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