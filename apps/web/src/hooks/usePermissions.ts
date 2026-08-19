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

    // Check staff permissions based on their role
    if (user.role === "apprentice" && user.staffRole) {
      const permissions = rolePermissions[user.staffRole];
      return permissions.includes(permission);
    }

    // If role is apprentice but no staffRole, deny access
    if (user.role === "apprentice") return false;

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

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
  };
};
