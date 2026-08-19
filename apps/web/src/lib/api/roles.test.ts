import { describe, it, expect } from "vitest";
import {
  backendRoleToUserRole,
  mapAuthUser,
  assertStaffRole,
  INVESTOR_COMING_SOON,
} from "@/lib/api/roles";
import type { AuthUser } from "@/lib/api/types";

describe("roles", () => {
  it("maps owner to role owner", () => {
    expect(backendRoleToUserRole("owner")).toEqual({ role: "owner" });
  });

  it("maps backend manager to apprentice with staffRole manager", () => {
    expect(backendRoleToUserRole("manager")).toEqual({
      role: "apprentice",
      staffRole: "manager",
    });
  });

  it("maps backend apprentice to apprentice", () => {
    expect(backendRoleToUserRole("apprentice")).toEqual({
      role: "apprentice",
    });
  });

  it("mapAuthUser preserves the backend staffRole for an owner", () => {
    const backend: AuthUser = {
      id: "u1",
      email: "owner@luxa.com",
      firstName: "Ada",
      lastName: "Lovelace",
      businessName: "LUXA",
      businessId: "b1",
      role: "owner",
      staffRole: "manager",
    };

    expect(mapAuthUser(backend)).toEqual({
      id: "u1",
      email: "owner@luxa.com",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "owner",
      staffRole: "manager",
      businessName: "LUXA",
      businessId: "b1",
      avatar: "",
    });
  });

  it("mapAuthUser maps a backend manager to apprentice with staffRole manager", () => {
    const backend: AuthUser = {
      id: "u2",
      email: "mgr@luxa.com",
      firstName: "Grace",
      lastName: "Hopper",
      businessName: "LUXA",
      businessId: "b1",
      role: "manager",
    };

    expect(mapAuthUser(backend)).toMatchObject({
      role: "apprentice",
      staffRole: "manager",
    });
  });

  it("mapAuthUser trusts the role-derived staffRole over a conflicting backend staffRole", () => {
    const backend: AuthUser = {
      id: "u3",
      email: "mgr@luxa.com",
      firstName: "Grace",
      lastName: "Hopper",
      businessName: "LUXA",
      businessId: "b1",
      role: "manager",
      staffRole: "sales-assistant",
    };

    expect(mapAuthUser(backend)).toMatchObject({
      role: "apprentice",
      staffRole: "manager",
    });
  });

  it("mapAuthUser defaults avatar to empty string when absent", () => {
    const backend: AuthUser = {
      id: "u1",
      email: "a@b.co",
      firstName: "Ada",
      lastName: "Lovelace",
      businessName: "LUXA",
      businessId: "b1",
      role: "owner",
    };

    expect(mapAuthUser(backend).avatar).toBe("");
  });

  it("assertStaffRole throws the coming soon error for investor", () => {
    expect(() => assertStaffRole("investor")).toThrow(INVESTOR_COMING_SOON);
  });

  it("assertStaffRole allows owner and apprentice", () => {
    expect(() => assertStaffRole("owner")).not.toThrow();
    expect(() => assertStaffRole("apprentice")).not.toThrow();
  });
});