"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUI } from "@/contexts/UIContext";
import { canAccessPath } from "@/lib/route-guards";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useUI();
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const sidebarWidth = sidebarCollapsed ? 80 : 280;

  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    // Initial check
    checkScreenSize();

    // Listen for resize
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <ProtectedRoute access={(user) => canAccessPath(pathname ?? "", user)}>
      <div className="min-h-screen bg-background relative font-sans selection:bg-accent selection:text-foreground">
        {/* Ambient Grid for Premium Dashboard */}
        <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent,theme(colors.background))] z-0" />
        <div className="fixed inset-0 pointer-events-none bg-grid-white opacity-[0.03] dark:opacity-[0.05] bg-[length:50px_50px] z-0" />

        <Sidebar />
        <Header userRole={user?.role || "owner"} sidebarWidth={sidebarWidth} />
        <main
          className="relative z-10 pt-20 pb-8 px-4 sm:px-6 lg:pt-24 min-h-screen"
          style={{
            marginLeft: isLargeScreen && !isRTL ? sidebarWidth : 0,
            marginRight: isLargeScreen && isRTL ? sidebarWidth : 0,
            transition: "margin 0.3s ease-in-out",
          }}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default React.memo(MainLayout);
