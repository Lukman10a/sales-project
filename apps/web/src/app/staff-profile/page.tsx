"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toProfileUpdate } from "@/lib/api/payloads";
import type { AppearanceSettings } from "@/types/profileTypes";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Palette } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import PerformanceStats from "@/components/staff-profile/PerformanceStats";
import ProfileSection from "@/components/staff-profile/ProfileSection";
import NotificationsSection from "@/components/staff-profile/NotificationsSection";
import AppearanceSection from "@/components/staff-profile/AppearanceSection";

export default function StaffProfile() {
  const { t, setLanguage } = useLanguage();
  const { updateUser } = useAuth();
  const {
    profile,
    notificationPreferences,
    appearanceSettings,
    isLoading,
    isError,
    setProfile,
    setNotificationPreferences,
    setAppearanceSettings,
    saveProfile,
    saveNotificationPreferences,
    saveAppearanceSettings,
    uploadAvatar,
  } = useProfile();

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

  // Apply the loaded backend appearance once the profile has been fetched
  useEffect(() => {
    if (!isLoading) {
      applyTheme(appearanceSettings.theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ACCEPTED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast(t("Please select a JPG, PNG, WebP, GIF, or SVG image"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast(t("Image size must be less than 5MB"));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      try {
        await uploadAvatar(imageData);
        updateUser({ avatar: imageData });
        toast(t("Profile picture updated"));
      } catch {
        toast(t("Failed to update profile picture"));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      await saveProfile();
      const payload = toProfileUpdate(profile);
      updateUser({
        ...(payload.firstName ? { firstName: payload.firstName } : {}),
        ...(payload.lastName ? { lastName: payload.lastName } : {}),
      });
      toast(t("Profile updated successfully"));
    } catch {
      toast(t("Failed to update profile"));
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await saveNotificationPreferences();
      toast(t("Notification preferences saved"));
    } catch {
      toast(t("Failed to save notification preferences"));
    }
  };

  const handleSaveAppearance = async () => {
    try {
      await saveAppearanceSettings();
      localStorage.setItem("luxa_appearance", JSON.stringify(appearanceSettings));
      applyTheme(appearanceSettings.theme);
      toast(t("Appearance settings saved"));
    } catch {
      toast(t("Failed to save appearance settings"));
    }
  };

  const handleThemeChange = (newTheme: AppearanceSettings["theme"]) => {
    setAppearanceSettings((a) => ({ ...a, theme: newTheme }));
    applyTheme(newTheme);
  };

  const handleLanguageChange = (lang: "en" | "ar") => {
    setLanguage(lang);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
        <div className="bg-card rounded-xl border shadow-sm p-6 space-y-4 animate-pulse">
          <div className="h-16 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted/70 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          {t("Profile Settings")}
        </h1>
        <p className="text-muted-foreground">
          {t("Failed to load profile")}
        </p>
      </div>
    );
  }

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
              onProfileChange={(p) =>
                setProfile((prev) => (prev ? { ...prev, ...p } : prev))
              }
              onAvatarUpload={handleAvatarUpload}
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
              notifications={notificationPreferences}
              onNotificationsChange={setNotificationPreferences}
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
              appearance={appearanceSettings}
              onAppearanceChange={setAppearanceSettings}
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