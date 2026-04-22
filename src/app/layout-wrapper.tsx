"use client";

import React from "react";
import { usePathname } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // Don't wrap auth pages and landing page with MainLayout
  const isAuthPage = pathname?.startsWith("/auth");
  const isLandingPage = pathname === "/" && !isAuthenticated;

  if (isAuthPage || isLandingPage) {
    return <>{children}</>;
  }

  return <MainLayout>{children}</MainLayout>;
}


