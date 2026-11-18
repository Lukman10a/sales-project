import { api } from "./client";
import type {
  AuthResponse,
  AuthSession,
  LoginResponse,
  MeResponse,
} from "./types";

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName: string;
}

export const authApi = {
  login: (email: string, password: string, remember = false) =>
    api.post<LoginResponse>("/auth/login", {
      email,
      password,
      ...(remember ? { remember: true } : {}),
    }),
  /** Second sign-in step: an authenticator code or a backup code. */
  verifyTwoFactor: (challenge: string, code: string) =>
    api.post<AuthResponse>("/auth/2fa/verify", { challenge, code }),
  register: (data: RegisterPayload) =>
    api.post<AuthResponse>("/auth/register", data),
  logout: () => api.post<{ message: string }>("/auth/logout"),
  logoutAll: () =>
    api.post<{ message: string; revoked: number }>("/auth/logout-all"),
  getMe: () => api.get<MeResponse>("/auth/me"),
  sessions: () => api.get<AuthSession[]>("/auth/sessions"),
  verifyEmail: (token: string) =>
    api.post<{ message: string }>("/auth/verify-email", { token }),
  resendVerification: (email: string) =>
    api.post<{ message: string }>("/auth/verify-email/resend", { email }),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>("/auth/reset-password", { token, password }),
  revokeSession: (id: string) =>
    api.delete<{ message: string }>(`/auth/sessions/${encodeURIComponent(id)}`),
};