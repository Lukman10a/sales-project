import { api } from "./client";
import type { AuthResponse, AuthSession, MeResponse } from "./types";

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName: string;
}

export const authApi = {
  login: (email: string, password: string, remember = false) =>
    api.post<AuthResponse>("/auth/login", {
      email,
      password,
      ...(remember ? { remember: true } : {}),
    }),
  register: (data: RegisterPayload) =>
    api.post<AuthResponse>("/auth/register", data),
  logout: () => api.post<{ message: string }>("/auth/logout"),
  logoutAll: () =>
    api.post<{ message: string; revoked: number }>("/auth/logout-all"),
  getMe: () => api.get<MeResponse>("/auth/me"),
  sessions: () => api.get<AuthSession[]>("/auth/sessions"),
  revokeSession: (id: string) =>
    api.delete<{ message: string }>(`/auth/sessions/${encodeURIComponent(id)}`),
};