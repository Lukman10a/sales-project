import { describe, it, expect } from "vitest";
import {
  guardForPath,
  canAccessPath,
  safeLandingPath,
} from "@/lib/route-guards";
import type { AppUser } from "@/lib/api/roles";

function user(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "u1",
    email: "a@luxa.com",
    firstName: "Ada",
    lastName: "Lovelace",
    role: "apprentice",
    businessName: "LUXA",
    avatar: "",
    ...overrides,
  };
}

const owner = user({ role: "owner" });
const manager = user({ role: "apprentice", staffRole: "manager" });
const salesAssistant = user({
  role: "apprentice",
  staffRole: "sales-assistant",
});
const checkout = user({ role: "apprentice", staffRole: "checkout" });
const inventoryStaff = user({ role: "apprentice", staffRole: "inventory" });

describe("guardForPath", () => {
  it("returns no guard for public routes", () => {
    expect(guardForPath("/")).toBeNull();
    expect(guardForPath("/auth/login")).toBeNull();
    expect(guardForPath("/api/auth/me")).toBeNull();
  });

  it("covers every app route with an explicit spec", () => {
    const routes = [
      "/dashboard",
      "/sales",
      "/inventory",
      "/inventory/abc123",
      "/analytics",
      "/team",
      "/reports",
      "/insights",
      "/data",
      "/withdrawals",
      "/investors",
      "/investors/overview",
      "/investors/inv-1",
      "/investors/inv-1/edit",
      "/investors/inv-1/withdrawals",
      "/investor-dashboard",
      "/investor-insights",
      "/investor-profile",
      "/notifications",
      "/profile",
      "/staff-profile",
      "/settings",
    ];
    for (const route of routes) {
      expect(guardForPath(route), route).not.toBeNull();
    }
  });
});

describe("canAccessPath", () => {
  it("grants the owner every page", () => {
    const routes = [
      "/dashboard",
      "/sales",
      "/inventory",
      "/inventory/abc123",
      "/analytics",
      "/team",
      "/reports",
      "/insights",
      "/data",
      "/withdrawals",
      "/investors",
      "/investors/overview",
      "/investor-dashboard",
      "/investor-insights",
      "/investor-profile",
      "/notifications",
      "/profile",
      "/settings",
    ];
    for (const route of routes) {
      expect(canAccessPath(route, owner), route).toBe(true);
    }
  });

  it("grants the manager only dashboard/sales/inventory/analytics/team/notifications", () => {
    const allowed = [
      "/dashboard",
      "/sales",
      "/inventory",
      "/inventory/abc123",
      "/analytics",
      "/team",
      "/notifications",
      "/staff-profile",
      "/settings",
    ];
    const denied = [
      "/reports",
      "/insights",
      "/data",
      "/withdrawals",
      "/investors",
      "/investors/overview",
      "/investor-dashboard",
      "/investor-insights",
      "/investor-profile",
      "/profile",
    ];
    for (const route of allowed) {
      expect(canAccessPath(route, manager), route).toBe(true);
    }
    for (const route of denied) {
      expect(canAccessPath(route, manager), route).toBe(false);
    }
  });

  it("grants a sales-assistant sales and inventory but not analytics/team", () => {
    expect(canAccessPath("/sales", salesAssistant)).toBe(true);
    expect(canAccessPath("/inventory", salesAssistant)).toBe(true);
    expect(canAccessPath("/notifications", salesAssistant)).toBe(true);
    expect(canAccessPath("/staff-profile", salesAssistant)).toBe(true);
    expect(canAccessPath("/analytics", salesAssistant)).toBe(false);
    expect(canAccessPath("/dashboard", salesAssistant)).toBe(false);
    expect(canAccessPath("/team", salesAssistant)).toBe(false);
    expect(canAccessPath("/data", salesAssistant)).toBe(false);
    expect(canAccessPath("/investors", salesAssistant)).toBe(false);
    expect(canAccessPath("/profile", salesAssistant)).toBe(false);
  });

  it("grants checkout sales, inventory, and notifications but no reports pages", () => {
    expect(canAccessPath("/sales", checkout)).toBe(true);
    expect(canAccessPath("/notifications", checkout)).toBe(true);
    expect(canAccessPath("/inventory", checkout)).toBe(true);
    expect(canAccessPath("/team", checkout)).toBe(false);
    expect(canAccessPath("/analytics", checkout)).toBe(false);
  });

  it("grants inventory staff inventory and notifications but not sales", () => {
    expect(canAccessPath("/inventory", inventoryStaff)).toBe(true);
    expect(canAccessPath("/inventory/abc123", inventoryStaff)).toBe(true);
    expect(canAccessPath("/notifications", inventoryStaff)).toBe(true);
    expect(canAccessPath("/sales", inventoryStaff)).toBe(false);
    expect(canAccessPath("/team", inventoryStaff)).toBe(false);
  });

  it("grants the owner /staff-profile access through the staff profile route", () => {
    expect(canAccessPath("/staff-profile", owner)).toBe(false);
    expect(canAccessPath("/staff-profile", salesAssistant)).toBe(true);
  });

  it("denies every guarded route to an anonymous visitor", () => {
    expect(canAccessPath("/dashboard", null)).toBe(false);
    expect(canAccessPath("/notifications", null)).toBe(false);
    expect(canAccessPath("/", null)).toBe(true);
  });

  it("fails closed on routes with no declared guard", () => {
    expect(canAccessPath("/some-unknown-page", owner)).toBe(false);
    expect(canAccessPath("/some-unknown-page", null)).toBe(false);
  });

  it("grants sales when the user has record-sales even without a staffRole", () => {
    const roleless = user({ permissions: ["record-sales"] });
    expect(canAccessPath("/sales", roleless)).toBe(true);
  });

  it("honours an explicitly empty permission array on permission-gated routes only", () => {
    const emptyPerms = user({
      role: "apprentice",
      staffRole: "manager",
      permissions: [],
    });
    // Permission-gated routes consult the real array and deny.
    expect(canAccessPath("/team", emptyPerms)).toBe(false);
    expect(canAccessPath("/sales", emptyPerms)).toBe(false);
    // Role-gated routes (backend @Roles owner/manager) are unaffected.
    expect(canAccessPath("/analytics", emptyPerms)).toBe(true);
  });
});

describe("safeLandingPath", () => {
  it("sends owner and manager to the dashboard", () => {
    expect(safeLandingPath(owner)).toBe("/dashboard");
    expect(safeLandingPath(manager)).toBe("/dashboard");
  });

  it("sends a sales-enabled apprentice to the sales workspace", () => {
    expect(safeLandingPath(salesAssistant)).toBe("/sales");
    expect(safeLandingPath(checkout)).toBe("/sales");
  });

  it("sends an inventory-only apprentice to the inventory page", () => {
    expect(safeLandingPath(inventoryStaff)).toBe("/inventory");
  });

  it("falls back to notifications for staff with no feature access", () => {
    const noPerms = user({ permissions: [] });
    expect(safeLandingPath(noPerms)).toBe("/notifications");
  });

  it("falls back to /auth/login for an anonymous visitor", () => {
    expect(safeLandingPath(null)).toBe("/auth/login");
  });
});