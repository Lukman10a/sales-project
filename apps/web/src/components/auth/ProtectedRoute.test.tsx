import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/AuthContext", () => ({ useAuth: useAuthMock }));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/components/auth/AccessDenied", () => ({
  AccessDenied: () => <div>ACCESS_DENIED_MARKER</div>,
}));

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
  usePathname: () => "/dashboard",
}));

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const alwaysAllow = () => true;
const alwaysDeny = () => false;

describe("ProtectedRoute", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    routerMocks.replace.mockReset();
    routerMocks.push.mockReset();
  });

  afterEach(() => cleanup());

  it("renders nothing and redirects to /auth/login when unauthenticated", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    render(
      <ProtectedRoute>
        <div>protected</div>
      </ProtectedRoute>,
    );

    expect(routerMocks.replace).toHaveBeenCalledWith("/auth/login");
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });

  it("does not redirect while still loading", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
    });

    render(
      <ProtectedRoute>
        <div>protected</div>
      </ProtectedRoute>,
    );

    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("renders children when authenticated and the access check passes", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: "apprentice" },
    });

    render(
      <ProtectedRoute access={alwaysAllow}>
        <div>protected</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("protected")).toBeInTheDocument();
  });

  it("renders children when authenticated with no access prop", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: "owner" },
    });

    render(
      <ProtectedRoute>
        <div>protected</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("protected")).toBeInTheDocument();
  });

  it("shows AccessDenied instead of redirecting when the access check fails", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: "apprentice" },
    });

    render(
      <ProtectedRoute access={alwaysDeny}>
        <div>protected</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("ACCESS_DENIED_MARKER")).toBeInTheDocument();
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });
});