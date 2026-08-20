import { useAuth } from "../contexts/AuthContext";
import { Permission } from "../types/teamTypes";
import { canViewReports, hasEffectivePermission } from "../lib/permissions";

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
    return hasEffectivePermission(user, permission);
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

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    canViewReports: () => canViewReports(user),
  };
};
