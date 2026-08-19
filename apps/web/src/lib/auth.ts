// Real authentication service backed by the LUXA API.
//
// The public surface (login/register/logout/isAuthenticated/getLastRole) is
// kept so callers change minimally. Sessions live in tokens
// (`luxa_access_token`/`luxa_refresh_token`) + AuthContext state, plus the
// opaque `luxa_auth` cookie that exists solely for the middleware redirect.

import { authApi } from "@/lib/api/auth";
import {
  getAccessToken,
  setTokens,
  clearTokens,
  isTokenExpired,
} from "@/lib/api/tokens";
import { mapAuthUser, assertStaffRole, type AppUser } from "@/lib/api/roles";
import { AUTH_COOKIE_NAME } from "@/lib/middleware-guard";

export type User = AppUser;

export interface LoginCredentials {
  email: string;
  password: string;
  role: "owner" | "apprentice" | "investor";
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

function setAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=1; path=/; SameSite=Lax`;
}

function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; Max-Age=0; path=/`;
}

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<User> {
    assertStaffRole(credentials.role);
    const response = await authApi.login(
      credentials.email,
      credentials.password,
    );
    setTokens(response.access_token, response.refresh_token);
    setAuthCookie();
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
    setTokens(response.access_token, response.refresh_token);
    setAuthCookie();
    return mapAuthUser(response.user);
  }

  static async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // Local session is cleared regardless of server-side outcome.
    }
    clearTokens();
    clearAuthCookie();
  }

  static async getCurrentUser(): Promise<User | null> {
    if (!getAccessToken()) return null;
    try {
      const me = await authApi.getMe();
      return mapAuthUser(me);
    } catch {
      clearTokens();
      clearAuthCookie();
      return null;
    }
  }

  static isAuthenticated(): boolean {
    const token = getAccessToken();
    return token !== null && !isTokenExpired(token);
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
  return user.role === "apprentice" ? "/sales" : "/dashboard";
}