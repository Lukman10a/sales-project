import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/AuthContext", () => ({ useAuth: useAuthMock }));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k, isRTL: false }),
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

  it("redirects to / when requireRole does not match the user role", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: "apprentice" },
    });

    render(
      <ProtectedRoute requireRole="owner">
        <div>protected</div>
      </ProtectedRoute>,
    );

    expect(routerMocks.replace).toHaveBeenCalledWith("/");
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
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
});