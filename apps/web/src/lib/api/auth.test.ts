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
      access_token: "at",
      refresh_token: "rt",
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
      access_token: "at",
      refresh_token: "rt",
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
});