import type { AuthUser } from "./types";
import type { Permission } from "@/types/teamTypes";

export type StaffRole =
  | "sales-assistant"
  | "manager"
  | "checkout"
  | "inventory"
  | "investor";

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
  permissions?: Permission[];
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
 * Abort a login/registration attempt when the caller explicitly picks the
 * "investor" option on the login form. There is no Backend investor module;
 * investor screens are mock-only and the manual Investor choice stays blocked
 * with a "coming soon" tooltip.
 *
 * This gates the *manual choice* only. A team-invited investor logs in through
 * the normal flow (their backend account is `apprentice` with
 * `staffRole = "investor"`) and is carried through by `mapAuthUser`; nothing
 * here sees that account's staffRole, so invited investors are never blocked.
 */
export function assertStaffRole(role: string | undefined): void {
  if (role === "investor") {
    throw new Error(INVESTOR_COMING_SOON);
  }
}

/** Whether a signed-in user is a team-invited investor. */
export function isInvestor(user: AppUser | null): boolean {
  return user?.staffRole === "investor";
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
    permissions: backendUser.permissions as Permission[] | undefined,
  };
}