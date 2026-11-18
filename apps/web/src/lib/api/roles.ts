import type { AuthUser } from "./types";
import type { Permission } from "@/types/teamTypes";
import { fromBackendPermissions } from "./access-compat";

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
  /** Largest discount (percent) this user may give; owners 100. */
  maxDiscountPercent?: number;
  emailVerified?: boolean;
  verifyBy?: string | null;
}

export const INVESTOR_COMING_SOON =
  "Investor portal is coming soon. Please use a staff account to continue.";

/**
 * Map a backend role (owner, manager, cashier) to the frontend role model.
 * Staff become `apprentice` with the staffRole the UI already understands:
 * `manager` for managers and `checkout` for cashiers.
 */
export function backendRoleToUserRole(
  role: string,
): { role: AppRole; staffRole?: StaffRole } {
  switch (role) {
    case "owner":
      return { role: "owner" };
    case "manager":
      return { role: "apprentice", staffRole: "manager" };
    case "cashier":
      return { role: "apprentice", staffRole: "checkout" };
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
    permissions: backendUser.permissions
      ? fromBackendPermissions(backendUser.permissions)
      : undefined,
    maxDiscountPercent: backendUser.maxDiscountPercent,
    emailVerified: backendUser.emailVerified ?? true,
    verifyBy: backendUser.verifyBy ?? null,
  };
}