"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Search, Moon, Sun, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUI } from "@/contexts/UIContext";

interface HeaderProps {
  userRole: "owner" | "apprentice" | "investor";
  sidebarWidth: number;
}

const Header = ({ userRole, sidebarWidth }: HeaderProps) => {
  const { t, language, toggleLanguage, isRTL } = useLanguage();
  const { user } = useAuth();
  const { mobileMenuOpen, setMobileMenuOpen } = useUI();
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [isClickable, setIsClickable] = useState(true);

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

  const displayName = user ? `${user.firstName} ${user.lastName}` : "User";
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "U";
  const roleLabel =
    userRole === "owner"
      ? t("Owner")
      : userRole === "investor"
        ? t("Investor")
        : t("Staff");

  // Determine profile route based on role
  const profileRoute =
    userRole === "investor"
      ? "/investor-profile"
      : userRole === "apprentice"
        ? "/staff-profile"
        : "/profile";

  return (
    <motion.header
      initial={false}
      animate={false}
      className="fixed top-0 h-16 lg:h-20 bg-card/80 backdrop-blur-xl border-b border-border z-30 flex items-center justify-between px-4 sm:px-6"
      style={{
        left: isLargeScreen ? (isRTL ? 0 : sidebarWidth) : 0,
        right: isLargeScreen ? (isRTL ? sidebarWidth : 0) : 0,
        transition: "left 0.3s ease-in-out, right 0.3s ease-in-out",
      }}
    >
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setMobileMenuOpen(!mobileMenuOpen);
          setIsClickable(false);
          setTimeout(() => setIsClickable(true), 300);
        }}
        disabled={!isClickable}
        aria-pressed={mobileMenuOpen}
        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        className="lg:hidden transition-all duration-200"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Search */}
      <div className="relative hidden md:block md:w-64 lg:w-80">
        <Search
          className={
            isRTL
              ? "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              : "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          }
        />
        <Input
          placeholder={t("Search inventory, sales, reports...")}
          className={
            isRTL
              ? "pr-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-accent"
              : "pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-accent"
          }
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="text-xs font-semibold hidden sm:flex"
        >
          {language === "en" ? "AR" : "EN"}
        </Button>
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </Button>

        {/* Profile */}
        <Link
          href={profileRoute}
          className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-border hover:opacity-80 transition-opacity"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <Badge
              variant="secondary"
              className={
                userRole === "owner"
                  ? "bg-accent/10 text-accent text-xs"
                  : userRole === "investor"
                    ? "bg-green-500/10 text-green-500 text-xs"
                    : "bg-primary/10 text-primary text-xs"
              }
            >
              {roleLabel}
            </Badge>
          </div>
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-primary/20">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </motion.header>
  );
};

export default React.memo(Header);


