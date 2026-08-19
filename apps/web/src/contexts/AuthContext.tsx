"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { AuthService, landingPathFor, User, LoginCredentials } from "@/lib/auth";
import type { SignupData } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    AuthService.getCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const loggedInUser = await AuthService.login(credentials);
      setUser(loggedInUser);
      AuthService.setLastRole(credentials.role);
      router.push(landingPathFor(loggedInUser));
    },
    [router],
  );

  const register = useCallback(
    async (data: SignupData) => {
      const newUser = await AuthService.register(data);
      setUser(newUser);
      AuthService.setLastRole(data.role);
      router.push(landingPathFor(newUser));
    },
    [router],
  );

  const logout = useCallback(async () => {
    await AuthService.logout();
    setUser(null);
    router.push("/auth/login");
  }, [router]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      login,
      logout,
      register,
      updateUser,
      isAuthenticated: !!user,
      isLoading,
    }),
    [user, login, logout, register, updateUser, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}