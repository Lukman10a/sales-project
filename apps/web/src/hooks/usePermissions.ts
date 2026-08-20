import { useAuth } from "../contexts/AuthContext";
import { Permission } from "../types/teamTypes";
import { rolePermissions } from "../data/team";

/**
 * Hook to check if the current user has specific permissions
 * Returns an object with permission checking functions
 */
export const usePermissions = () => {
  const { user } = useAuth();

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;

    // Owners have all permissions
    if (user.role === "owner") return true;

    // Consult the real permission set from the backend payload when present.
    if (Array.isArray(user.permissions)) {
      return user.permissions.includes(permission);
    }

    // Fall back to the role map for staff whose token predates the new
    // permissions payload (undefined, not an empty array).
    if (user.role === "apprentice" && user.staffRole) {
      const permissions = rolePermissions[user.staffRole];
      return permissions.includes(permission);
    }

    return false;
  };

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some((permission) => hasPermission(permission));
  };

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every((permission) => hasPermission(permission));
  };

  /**
   * Check if user is owner (has all permissions)
   */
  const isOwner = (): boolean => {
    return user?.role === "owner";
  };

  /**
   * Coarse access gate: dashboard, analytics, and refunds are restricted to
   * owners and managers (backend `manager` maps to apprentice with
   * `staffRole === "manager"`).
   */
  const canViewReports = (): boolean => {
    return user?.role === "owner" || user?.staffRole === "manager";
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    canViewReports,
  };
};
