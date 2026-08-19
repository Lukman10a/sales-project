import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermissions } from "./usePermissions";

const authMock = vi.hoisted(() => ({
  user: null as User | null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authMock,
}));

import type { User } from "@/lib/auth";

describe("usePermissions", () => {
  beforeEach(() => {
    authMock.user = null;
  });

  it("canViewReports is true for owners", () => {
    authMock.user = { role: "owner" } as User;
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canViewReports()).toBe(true);
  });

  it("canViewReports is true for managers (apprentice + staffRole manager)", () => {
    authMock.user = { role: "apprentice", staffRole: "manager" } as User;
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canViewReports()).toBe(true);
  });

  it("canViewReports is false for other apprentices", () => {
    authMock.user = { role: "apprentice", staffRole: "sales-assistant" } as User;
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canViewReports()).toBe(false);
  });

  it("canViewReports is false when there is no user", () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canViewReports()).toBe(false);
  });

  it("isOwner is true only for owners", () => {
    authMock.user = { role: "owner" } as User;
    const ownerHook = renderHook(() => usePermissions());
    expect(ownerHook.result.current.isOwner()).toBe(true);

    authMock.user = { role: "apprentice", staffRole: "manager" } as User;
    const managerHook = renderHook(() => usePermissions());
    expect(managerHook.result.current.isOwner()).toBe(false);
  });
});