import type { AuthUser } from "./types";

export type StaffRole = "sales-assistant" | "manager" | "checkout" | "inventory";

export type AppRole = "owner" | "apprentice";

export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  staffRole?: StaffRole;
  businessName: string;
  businessId?: string;
  avatar: string;
}

export const INVESTOR_COMING_SOON =
  "Investor portal is coming soon. Please use a staff account to continue.";

/**
 * Map a backend staff role to the frontend role model. Backend `manager`
 * becomes `apprentice` with `staffRole = "manager"` so managers keep the
 * manager label the UI already understands.
 */
export function backendRoleToUserRole(
  role: string,
): { role: AppRole; staffRole?: StaffRole } {
  switch (role) {
    case "owner":
      return { role: "owner" };
    case "manager":
      return { role: "apprentice", staffRole: "manager" };
    case "apprentice":
      return { role: "apprentice" };
    default:
      return { role: "apprentice" };
  }
}

/**
 * Abort an investor login/registration attempt with a friendly message.
 * There is no Backend investor module; investor screens are mock-only.
 */
export function assertStaffRole(role: string | undefined): void {
  if (role === "investor") {
    throw new Error(INVESTOR_COMING_SOON);
  }
}

export function mapAuthUser(backendUser: AuthUser): AppUser {
  const { role, staffRole } = backendRoleToUserRole(backendUser.role);
  return {
    id: backendUser.id,
    email: backendUser.email,
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    role,
    staffRole: (staffRole ?? backendUser.staffRole) as StaffRole | undefined,
    businessName: backendUser.businessName,
    businessId: backendUser.businessId,
    avatar: backendUser.avatar ?? "",
  };
}