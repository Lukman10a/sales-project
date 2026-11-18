import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from "@/lib/api/client";
import { authApi } from "@/lib/api/auth";

const apiMock = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe("auth api", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
  });

  it("login posts exactly email and password without role", async () => {
    apiMock.post.mockResolvedValue({
      user: { id: "u1", email: "a@b.co" },
    });

    await authApi.login("a@b.co", "secret");

    expect(apiMock.post).toHaveBeenCalledWith("/auth/login", {
      email: "a@b.co",
      password: "secret",
    });
  });

  it("register posts the register payload without role", async () => {
    apiMock.post.mockResolvedValue({
      user: { id: "u1", email: "a@b.co" },
    });

    await authApi.register({
      email: "a@b.co",
      password: "secret",
      firstName: "Ada",
      lastName: "Lovelace",
      businessName: "LUXA",
    });

    expect(apiMock.post).toHaveBeenCalledWith("/auth/register", {
      email: "a@b.co",
      password: "secret",
      firstName: "Ada",
      lastName: "Lovelace",
      businessName: "LUXA",
    });
  });

  it("login adds remember only for a trusted device", async () => {
    apiMock.post.mockResolvedValue({ user: { id: "u1" } });

    await authApi.login("a@b.co", "secret", true);

    expect(apiMock.post).toHaveBeenCalledWith("/auth/login", {
      email: "a@b.co",
      password: "secret",
      remember: true,
    });
  });

  it("lists, revokes and signs out every session", async () => {
    apiMock.get.mockResolvedValue([]);
    apiMock.post.mockResolvedValue({ revoked: 2 });
    apiMock.delete.mockResolvedValue({ message: "Session revoked" });

    await authApi.sessions();
    await authApi.revokeSession("s/1");
    await authApi.logoutAll();

    expect(apiMock.get).toHaveBeenCalledWith("/auth/sessions");
    expect(apiMock.delete).toHaveBeenCalledWith("/auth/sessions/s%2F1");
    expect(apiMock.post).toHaveBeenCalledWith("/auth/logout-all");
  });

  it("logout posts to /auth/logout", async () => {
    apiMock.post.mockResolvedValue({ message: "Logged out successfully" });

    await authApi.logout();

    expect(apiMock.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("getMe returns the typed me payload", async () => {
    apiMock.get.mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      firstName: "Ada",
      lastName: "Lovelace",
      businessName: "LUXA",
      businessId: "b1",
      role: "owner",
    });

    const me = await authApi.getMe();

    expect(apiMock.get).toHaveBeenCalledWith("/auth/me");
    expect(me).toMatchObject({ firstName: "Ada", role: "owner" });
  });

  it("posts the emailed-link flows to their endpoints", async () => {
    apiMock.post.mockResolvedValue({ message: "ok" });

    await authApi.verifyEmail("tok");
    await authApi.resendVerification("a@b.co");
    await authApi.forgotPassword("a@b.co");
    await authApi.resetPassword("tok", "Brand-new-pass-1");

    expect(apiMock.post.mock.calls).toEqual([
      ["/auth/verify-email", { token: "tok" }],
      ["/auth/verify-email/resend", { email: "a@b.co" }],
      ["/auth/forgot-password", { email: "a@b.co" }],
      ["/auth/reset-password", { token: "tok", password: "Brand-new-pass-1" }],
    ]);
  });
});
