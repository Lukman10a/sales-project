"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Bell,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Users,
  Banknote,
  UserCircle,
  FileText,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUI } from "@/contexts/UIContext";
import { useNotifications } from "@/contexts/NotificationContext";

interface SidebarProps {
  userRole?: "owner" | "apprentice" | "investor";
  onRoleChange?: (role: "owner" | "apprentice" | "investor") => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: number;
}

const ownerNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Sales", href: "/sales", icon: ShoppingCart },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Team", href: "/team", icon: Users },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Data", href: "/data", icon: Database },
  { name: "Investors", href: "/investors", icon: Banknote },
  { name: "Withdrawals", href: "/withdrawals", icon: Banknote },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "AI Insights", href: "/insights", icon: Sparkles },
];

const staffNavigation: Record<
  "sales-assistant" | "manager" | "checkout" | "inventory",
  NavigationItem[]
> = {
  "sales-assistant": [
    { name: "Sales", href: "/sales", icon: ShoppingCart },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Notifications", href: "/notifications", icon: Bell },
  ],
  manager: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Sales", href: "/sales", icon: ShoppingCart },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Team", href: "/team", icon: Users },
    { name: "Notifications", href: "/notifications", icon: Bell },
  ],
  checkout: [
    { name: "Sales", href: "/sales", icon: ShoppingCart },
    { name: "Notifications", href: "/notifications", icon: Bell },
  ],
  inventory: [
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Notifications", href: "/notifications", icon: Bell },
  ],
};

const investorNavigation: NavigationItem[] = [
  {
    name: "Investment Dashboard",
    href: "/investor-dashboard",
    icon: LayoutDashboard,
  },
  { name: "AI Insights", href: "/investor-insights", icon: Sparkles },
  { name: "Notifications", href: "/notifications", icon: Bell },
];

const getNavigation = (
  role: "owner" | "apprentice" | "investor" = "owner",
  staffRole:
    | "sales-assistant"
    | "manager"
    | "checkout"
    | "inventory" = "sales-assistant",
) => {
  if (role === "investor") return investorNavigation;
  if (role === "apprentice") return staffNavigation[staffRole];
  return ownerNavigation;
};

const Sidebar = ({ userRole: propUserRole, onRoleChange }: SidebarProps) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, isRTL } = useLanguage();
  const { unreadCount: unreadNotificationCount } = useNotifications();
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useUI();
  const [isLargeScreen, setIsLargeScreen] = React.useState(false);
  const previousPathRef = React.useRef<string>(pathname);

  const collapsed = sidebarCollapsed;

  // Detect screen size
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Close mobile sidebar on navigation (only on mobile, only when pathname actually changes)
  React.useEffect(() => {
    // Don't do anything on large screens
    if (isLargeScreen) return;

    // Only close if pathname has actually changed
    if (previousPathRef.current !== pathname && mobileMenuOpen) {
      setMobileMenuOpen(false);
      previousPathRef.current = pathname;
    } else if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
    }
  }, [pathname, isLargeScreen, mobileMenuOpen, setMobileMenuOpen]);

  const isSettingsActive = pathname?.startsWith("/settings");
  const isProfileActive =
    pathname?.startsWith("/profile") ||
    pathname?.startsWith("/staff-profile") ||
    pathname?.startsWith("/investor-profile");

  const userRole = user?.role || propUserRole || "owner";
  const staffRole = user?.staffRole || "sales-assistant";
  const displayName = user ? `${user.firstName} ${user.lastName}` : t("User");
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "U";

  // Memoize animation values to prevent re-animation on every render
  const sidebarAnimation = React.useMemo(
    () => ({
      width: collapsed ? 80 : 280,
      x: isLargeScreen ? 0 : mobileMenuOpen ? 0 : isRTL ? 280 : -280,
    }),
    [collapsed, isLargeScreen, mobileMenuOpen, isRTL],
  );

  // Memoize navigation items and unread count
  const navigationItems = React.useMemo(
    () => getNavigation(userRole, staffRole),
    [userRole, staffRole],
  );

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={sidebarAnimation}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "fixed top-0 h-screen bg-sidebar flex flex-col shadow-2xl",
          "lg:shadow-none",
          "z-50",
          isRTL ? "right-0" : "left-0",
        )}
        style={{ pointerEvents: "auto" }}
      >
        {/* Mobile close touch area */}
        {mobileMenuOpen && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden absolute -right-12 top-4 w-10 h-10 bg-card rounded-full flex items-center justify-center shadow-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {/* Logo */}
        <div className="p-6 flex items-center justify-between border-b border-sidebar-border">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <Image
                  src="/primestore.jpg"
                  alt="PrimeStock"
                  width={60}
                  height={30}
                  className="h-8 w-auto object-contain"
                />
                <div>
                  <h1 className="font-display font-bold text-sidebar-foreground text-lg">
                    {t("PrimeStock")}
                  </h1>
                  <p className="text-xs text-sidebar-foreground/60">
                    {t("Inventory Manager")}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {collapsed && (
            <div className="mx-auto">
              <Image
                src="/primestore.jpg"
                alt="PrimeStock"
                width={40}
                height={20}
                className="h-6 w-auto object-contain"
              />
            </div>
          )}
        </div>

        {/* User Profile */}
        <div
          className={cn(
            "p-4 border-b border-sidebar-border",
            collapsed && "px-2",
          )}
        >
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <Avatar className="w-10 h-10 border-2 border-sidebar-border">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-sidebar-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 capitalize">
                    {userRole === "owner"
                      ? t("Owner")
                      : userRole === "investor"
                        ? t("Investor")
                        : t(
                            staffRole
                              .split("-")
                              .map(
                                (part) =>
                                  part.charAt(0).toUpperCase() + part.slice(1),
                              )
                              .join(" "),
                          )}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center"
              >
                <Avatar className="w-10 h-10 border-2 border-sidebar-border">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/") ||
              pathname?.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                onClick={() => {
                  // Auto-close mobile menu on navigation (only if on mobile)
                  if (!isLargeScreen && mobileMenuOpen) {
                    setMobileMenuOpen(false);
                  }
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive && "text-sidebar-primary",
                  )}
                />
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="font-medium text-sm whitespace-nowrap"
                    >
                      {t(item.name)}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.name === "Notifications" &&
                  unreadNotificationCount > 0 &&
                  !collapsed && (
                    <Badge className="ml-auto bg-destructive text-destructive-foreground text-xs">
                      {unreadNotificationCount}
                    </Badge>
                  )}
                {item.name === "Notifications" &&
                  unreadNotificationCount > 0 &&
                  collapsed && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                  )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link
            href={
              userRole === "investor"
                ? "/investor-profile"
                : userRole === "apprentice"
                  ? "/staff-profile"
                  : "/profile"
            }
            prefetch={true}
            onClick={() => {
              if (!isLargeScreen && mobileMenuOpen) {
                setMobileMenuOpen(false);
              }
            }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              isProfileActive
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              collapsed && "justify-center",
            )}
          >
            <UserCircle className="w-5 h-5" />
            {!collapsed && (
              <span className="font-medium text-sm">{t("Profile")}</span>
            )}
          </Link>
          <Link
            href="/settings"
            prefetch={true}
            onClick={() => {
              if (!isLargeScreen && mobileMenuOpen) {
                setMobileMenuOpen(false);
              }
            }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              isSettingsActive
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              collapsed && "justify-center",
            )}
          >
            <Settings className="w-5 h-5" />
            {!collapsed && (
              <span className="font-medium text-sm">{t("Settings")}</span>
            )}
          </Link>
          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all",
              collapsed && "justify-center",
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && (
              <span className="font-medium text-sm">{t("Logout")}</span>
            )}
          </button>
        </div>

        {/* Collapse Button - Desktop only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "hidden lg:flex absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-card border border-border rounded-full items-center justify-center shadow-md hover:bg-muted transition-colors",
            isRTL ? "-left-3" : "-right-3",
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      </motion.aside>
    </>
  );
};

export default React.memo(Sidebar);


