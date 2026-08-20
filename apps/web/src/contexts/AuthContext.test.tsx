import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ api: apiMock }));

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const meResponse = {
  id: "u1",
  email: "owner@luxa.com",
  firstName: "Ada",
  lastName: "Lovelace",
  businessName: "LUXA",
  businessId: "b1",
  role: "owner",
  avatar: "data:image/png;base64,abc",
};

function authResponse(
  role: "owner" | "apprentice" | "manager",
  staffRole?: string,
) {
  return {
    user: {
      id: "u1",
      email: "a@b.co",
      firstName: "Ada",
      lastName: "Lovelace",
      businessName: "LUXA",
      businessId: "b1",
      role,
      staffRole,
    },
    access_token: "at",
    refresh_token: "rt",
  };
}

function Harness() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="name">{user?.firstName ?? "none"}</span>
      <span data-testid="avatar">{user?.avatar ?? "none"}</span>
      <button
        onClick={() =>
          login({ email: "a@b.co", password: "Password1", role: "owner" })
        }
      >
        login-owner
      </button>
      <button
        onClick={() =>
          login({
            email: "a@b.co",
            password: "Password1",
            role: "apprentice",
          })
        }
      >
        login-apprentice
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    routerMocks.push.mockReset();
    routerMocks.replace.mockReset();
    localStorage.clear();
    document.cookie = "";
  });

  afterEach(() => cleanup());

  it("hydrates the session from getMe when a token exists", async () => {
    localStorage.setItem("luxa_access_token", "valid-token");
    apiMock.get.mockResolvedValue(meResponse);

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    expect(apiMock.get).toHaveBeenCalledWith("/auth/me");
    await waitFor(() =>
      expect(screen.getByTestId("name").textContent).toBe("Ada"),
    );
    expect(screen.getByTestId("avatar").textContent).toBe(
      "data:image/png;base64,abc",
    );
    expect(screen.getByTestId("auth").textContent).toBe("true");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("never reads the old luxa_auth_user localStorage key", async () => {
    localStorage.setItem("luxa_access_token", "valid-token");
    apiMock.get.mockResolvedValue(meResponse);
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("name").textContent).toBe("Ada"),
    );
    expect(getItemSpy).not.toHaveBeenCalledWith("luxa_auth_user");
  });

  it("redirects an owner to /dashboard after login", async () => {
    apiMock.post.mockResolvedValue(authResponse("owner"));

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    fireEvent.click(screen.getByText("login-owner"));
    await waitFor(() => expect(routerMocks.push).toHaveBeenCalledWith("/dashboard"));
    expect(screen.getByTestId("auth").textContent).toBe("true");
  });

  it("redirects an apprentice to /sales after login", async () => {
    apiMock.post.mockResolvedValue(authResponse("apprentice", "sales-assistant"));

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    fireEvent.click(screen.getByText("login-apprentice"));
    await waitFor(() => expect(routerMocks.push).toHaveBeenCalledWith("/sales"));
  });

  it("redirects a manager to /dashboard after login", async () => {
    apiMock.post.mockResolvedValue(authResponse("manager"));

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    fireEvent.click(screen.getByText("login-apprentice"));
    await waitFor(() =>
      expect(routerMocks.push).toHaveBeenCalledWith("/dashboard"),
    );
  });

  it("logout clears the session and redirects to /auth/login", async () => {
    apiMock.post.mockImplementation(async (path: string) => {
      if (path === "/auth/login") return authResponse("owner");
      if (path === "/auth/logout") return { message: "Logged out" };
      return { message: "ok" };
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    fireEvent.click(screen.getByText("login-owner"));
    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("true"));

    fireEvent.click(screen.getByText("logout"));
    await waitFor(() =>
      expect(routerMocks.push).toHaveBeenCalledWith("/auth/login"),
    );
    expect(screen.getByTestId("auth").textContent).toBe("false");
    expect(localStorage.getItem("luxa_access_token")).toBeNull();
  });
});