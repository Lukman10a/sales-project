import { isInvestor, type AppRole, type AppUser } from "@/lib/api/roles";
import type { Permission } from "@/types/teamTypes";
import { isPublicPath } from "@/lib/middleware-guard";
import {
  canViewReports,
  hasEffectivePermission,
} from "@/lib/permissions";

/**
 * Route guard. The edge middleware only checks the opaque `luxa_auth` cookie
 * (role-blind); real role/permission enforcement lives here, client-side, so
 * every app route declares which staff may enter and everyone else is shown
 * AccessDenied. Public routes (/, /auth, /api) have no spec and always pass;
 * any other unlisted route is denied.
 */
export type RouteAccessSpec =
  | { kind: "owner" }
  | { kind: "manager-or-owner" }
  | { kind: "any-staff" }
  | { kind: "any-permission"; permissions: Permission[] }
  | { kind: "app-role"; appRoles: AppRole[] }
  | { kind: "investor-or-owner" };

interface RouteGuardEntry {
  path: string;
  spec: RouteAccessSpec;
}

const ROUTE_GUARDS: RouteGuardEntry[] = [
  // Coarse owner/manager pages.
  { path: "/dashboard", spec: { kind: "manager-or-owner" } },
  { path: "/analytics", spec: { kind: "manager-or-owner" } },

  // Owner-only pages (data-management surfaces are mock).
  { path: "/insights", spec: { kind: "owner" } },
  { path: "/reports", spec: { kind: "owner" } },
  { path: "/data", spec: { kind: "owner" } },
  { path: "/withdrawals", spec: { kind: "owner" } },
  { path: "/investors", spec: { kind: "owner" } },

  // Investor-facing pages: owners plus team-invited investors. Investor
  // screens stay mock/coming-soon (T13); invited investors may still land here.
  { path: "/investor-dashboard", spec: { kind: "investor-or-owner" } },
  { path: "/investor-insights", spec: { kind: "investor-or-owner" } },
  { path: "/investor-profile", spec: { kind: "investor-or-owner" } },

  // Permission-gated workspace pages. Matches the Backend's OR-style
  // @RequirePermissions lists.
  {
    path: "/sales",
    spec: {
      kind: "any-permission",
      permissions: ["record-sales", "view-sales-history"],
    },
  },
  {
    path: "/inventory",
    spec: {
      kind: "any-permission",
      permissions: ["view-inventory", "view-products"],
    },
  },
  {
    path: "/team",
    spec: { kind: "any-permission", permissions: ["assign-roles"] },
  },

  // Profile pages follow the role model.
  { path: "/profile", spec: { kind: "app-role", appRoles: ["owner"] } },
  {
    path: "/staff-profile",
    spec: { kind: "app-role", appRoles: ["apprentice"] },
  },

  // Universal staff pages.
  { path: "/settings", spec: { kind: "any-staff" } },
  { path: "/notifications", spec: { kind: "any-staff" } },
];

/** The access spec for a pathname, or null when the route is public. */
export function guardForPath(pathname: string): RouteAccessSpec | null {
  if (isPublicPath(pathname)) return null;
  for (const entry of ROUTE_GUARDS) {
    if (pathname === entry.path || pathname.startsWith(`${entry.path}/`)) {
      return entry.spec;
    }
  }
  return null;
}

/** Whether a user satisfies a single access spec. */
export function canAccessSpec(
  user: AppUser | null,
  spec: RouteAccessSpec,
): boolean {
  switch (spec.kind) {
    case "owner":
      return user?.role === "owner";
    case "manager-or-owner":
      return canViewReports(user);
    case "any-staff":
      return user !== null;
    case "any-permission":
      return spec.permissions.some((permission) =>
        hasEffectivePermission(user, permission),
      );
    case "app-role":
      return user !== null && spec.appRoles.includes(user.role);
    case "investor-or-owner":
      return user?.role === "owner" || isInvestor(user);
  }
}

/** Whether a user may enter the given pathname. */
export function canAccessPath(
  pathname: string,
  user: AppUser | null,
): boolean {
  if (isPublicPath(pathname)) return true;
  const spec = guardForPath(pathname);
  if (!spec) return false;
  return canAccessSpec(user, spec);
}

/**
 * A page the user is guaranteed to be allowed onto, used as the AccessDenied
 * fallback so the "Go to..." button can never loop back onto a denied page.
 */
export function safeLandingPath(user: AppUser | null): string {
  if (!user) return "/auth/login";
  if (isInvestor(user)) return "/investor-dashboard";
  if (canViewReports(user)) return "/dashboard";
  if (
    hasEffectivePermission(user, "record-sales") ||
    hasEffectivePermission(user, "view-sales-history")
  ) {
    return "/sales";
  }
  if (
    hasEffectivePermission(user, "view-inventory") ||
    hasEffectivePermission(user, "view-products")
  ) {
    return "/inventory";
  }
  return "/notifications";
}