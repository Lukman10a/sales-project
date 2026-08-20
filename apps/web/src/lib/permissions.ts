import type { AppUser } from "@/lib/api/roles";
import type { Permission } from "@/types/teamTypes";
import { rolePermissions } from "@/data/team";

/**
 * Whether a user holds a granular permission. Owners hold every permission;
 * staff consult their real permission array from the backend payload, falling
 * back to the role map for staff whose token predates the permissions payload
 * (undefined, not an empty array). An explicitly empty array denies everything.
 */
export function hasEffectivePermission(
  user: AppUser | null,
  permission: Permission,
): boolean {
  if (!user) return false;
  if (user.role === "owner") return true;
  if (Array.isArray(user.permissions)) return user.permissions.includes(permission);
  if (user.role === "apprentice" && user.staffRole) {
    return rolePermissions[user.staffRole].includes(permission);
  }
  return false;
}

/**
 * Coarse access gate: dashboard, analytics, and refunds are restricted to
 * owners and managers (backend `manager` maps to apprentice with
 * `staffRole === "manager"`).
 */
export function canViewReports(user: AppUser | null): boolean {
  return user?.role === "owner" || user?.staffRole === "manager";
}