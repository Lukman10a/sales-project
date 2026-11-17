// Real authentication service backed by the LUXA API.
//
// The session lives in httpOnly cookies set by the API: page scripts can
// neither read nor store a token. The browser holds the cookies, AuthContext
// holds the user, and the readable `luxa_csrf` cookie signals that a session
// may exist (the API decides whether it really does).

import { authApi } from "@/lib/api/auth";
import { hasSession } from "@/lib/api/client";
import { mapAuthUser, assertStaffRole, type AppUser } from "@/lib/api/roles";
import { safeLandingPath } from "@/lib/route-guards";

export type User = AppUser;

export interface LoginCredentials {
  email: string;
  password: string;
  role: "owner" | "apprentice" | "investor";
  /** 'Trust this device': keep the session for 30 days. */
  remember?: boolean;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "owner" | "apprentice" | "investor";
  businessName: string;
}

const ROLE_STORAGE_KEY = "luxa_last_role";

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<User> {
    assertStaffRole(credentials.role);
    const response = await authApi.login(
      credentials.email,
      credentials.password,
      credentials.remember ?? false,
    );
    return mapAuthUser(response.user);
  }

  static async register(data: SignupData): Promise<User> {
    assertStaffRole(data.role);
    const response = await authApi.register({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      businessName: data.businessName,
    });
    return mapAuthUser(response.user);
  }

  static async logout(): Promise<void> {
    try {
      // Revokes the session server-side and clears its cookies.
      await authApi.logout();
    } catch {
      // Already signed out (expired or revoked): nothing left to clear.
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    if (!hasSession()) return null;
    try {
      const me = await authApi.getMe();
      return mapAuthUser(me);
    } catch {
      return null;
    }
  }

  /** Cheap hint for redirects; the API remains the authority. */
  static isAuthenticated(): boolean {
    return hasSession();
  }

  static getLastRole(): "owner" | "apprentice" | "investor" {
    if (typeof window === "undefined") return "owner";
    return (
      (localStorage.getItem(ROLE_STORAGE_KEY) as
        | "owner"
        | "apprentice"
        | "investor") || "owner"
    );
  }

  static setLastRole(role: "owner" | "apprentice" | "investor"): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(ROLE_STORAGE_KEY, role);
  }
}

export function landingPathFor(user: User): string {
  // Route to a page the user is guaranteed access to. Delegating to the route
  // guard's safe landing means managers land on /dashboard while apprentices
  // land somewhere their permissions allow (never a page the guard denies).
  return safeLandingPath(user);
}