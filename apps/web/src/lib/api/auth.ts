import { api } from "./client";
import type { AuthResponse, MeResponse } from "./types";

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }),
  register: (data: RegisterPayload) =>
    api.post<AuthResponse>("/auth/register", data),
  logout: () => api.post<{ message: string }>("/auth/logout"),
  getMe: () => api.get<MeResponse>("/auth/me"),
};