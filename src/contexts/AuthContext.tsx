"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthService, User, LoginCredentials } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: import("@/lib/auth").SignupData) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount and load avatar from profile storage
  useEffect(() => {
    const currentUser = AuthService.getUser();
    if (currentUser) {
      // Load avatar from profile storage based on role
      let profileKey = "luxa_profile";
      if (currentUser.role === "apprentice") {
        profileKey = "luxa_staff_profile";
      } else if (currentUser.role === "investor") {
        profileKey = "luxa_investor_profile";
      }

      const profileData = localStorage.getItem(profileKey);
      if (profileData) {
        try {
          const profile = JSON.parse(profileData);
          if (profile.avatar) {
            currentUser.avatar = profile.avatar;
          }
        } catch (e) {
          console.error("Failed to load avatar from profile:", e);
        }
      }
    }
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const user = await AuthService.login(credentials);
    setUser(user);

    // Redirect based on user role
    if (user.role === "investor") {
      router.push("/investor-dashboard");
    } else {
      router.push("/dashboard");
    }
  };

  const register = async (data: import("@/lib/auth").SignupData) => {
    const user = await AuthService.register(data);
    setUser(user);
    // Redirect based on user role
    if (user.role === "investor") {
      router.push("/investor-dashboard");
    } else {
      router.push("/dashboard");
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
    router.push("/auth/login");
  };

  const updateUser = (updates: Partial<User>) => {
    try {
      // For avatar updates, only update state without localStorage
      if (updates.avatar && user) {
        setUser({ ...user, ...updates });
      } else {
        const updatedUser = AuthService.updateUser(updates);
        setUser(updatedUser);
      }
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, isLoading],
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


