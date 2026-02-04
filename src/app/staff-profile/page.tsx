"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Palette } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import PerformanceStats from "@/components/staff-profile/PerformanceStats";
import ProfileSection from "@/components/staff-profile/ProfileSection";
import NotificationsSection from "@/components/staff-profile/NotificationsSection";
import AppearanceSection from "@/components/staff-profile/AppearanceSection";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
}

interface NotificationsData {
  email: boolean;
  push: boolean;
  sms: boolean;
  stockAlerts: boolean;
  newProducts: boolean;
  priceUpdates: boolean;
}

interface AppearanceData {
  theme: string;
  language: "en" | "ar";
  compactMode: boolean;
}

export default function StaffProfile() {
  const { t, setLanguage } = useLanguage();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileData>({
    name: user?.firstName + " " + user?.lastName || "Staff Member",
    email: user?.email || "",
    phone: "",
    avatar: user?.avatar || "",
    bio: "",
  });

  const [notifications, setNotifications] = useState<NotificationsData>({
    email: true,
    push: true,
    sms: false,
    stockAlerts: true,
    newProducts: true,
    priceUpdates: true,
  });

  const [appearance, setAppearance] = useState<AppearanceData>({
    theme: "light",
    language: "en",
    compactMode: false,
  });

  // Load settings from localStorage and apply theme
  useEffect(() => {
    const savedProfile = localStorage.getItem("luxa_staff_profile");
    const savedNotifications = localStorage.getItem("luxa_staff_notifications");
    const savedAppearance = localStorage.getItem("luxa_appearance");

    if (savedProfile) setProfile(JSON.parse(savedProfile));
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
    if (savedAppearance) {
      const parsed = JSON.parse(savedAppearance);
      setAppearance(parsed);
      applyTheme(parsed.theme);
    }
  }, []);

  const applyTheme = (theme: string) => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else if (theme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const handleSaveProfile = () => {
    localStorage.setItem("luxa_staff_profile", JSON.stringify(profile));
    toast(t("Profile updated successfully"));
  };

  const handleSaveNotifications = () => {
    localStorage.setItem(
      "luxa_staff_notifications",
      JSON.stringify(notifications),
    );
    toast(t("Notification preferences saved"));
  };

  const handleSaveAppearance = () => {
    localStorage.setItem("luxa_appearance", JSON.stringify(appearance));
    applyTheme(appearance.theme);
    toast(t("Appearance settings saved"));
  };

  const handleThemeChange = (newTheme: string) => {
    setAppearance({ ...appearance, theme: newTheme });
    applyTheme(newTheme);
  };

  const handleLanguageChange = (lang: "en" | "ar") => {
    setLanguage(lang);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            {t("Staff Profile & Settings")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("Manage your profile and preferences")}
          </p>
        </div>
        <Badge className="w-fit">{t("Staff Member")}</Badge>
      </div>

      {/* Performance Overview */}
      <PerformanceStats />

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Profile")}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Notifications")}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Appearance")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ProfileSection
              profile={profile}
              onProfileChange={setProfile}
              onSave={handleSaveProfile}
            />
          </motion.div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <NotificationsSection
              notifications={notifications}
              onNotificationsChange={setNotifications}
              onSave={handleSaveNotifications}
            />
          </motion.div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AppearanceSection
              appearance={appearance}
              onAppearanceChange={setAppearance}
              onThemeChange={handleThemeChange}
              onLanguageChange={handleLanguageChange}
              onSave={handleSaveAppearance}
            />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
