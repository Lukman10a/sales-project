"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Shield, Palette, Database } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  userProfile,
  notificationPreferences,
  securitySettings,
  appearanceSettings,
} from "@/data/profile";
import ProfileInfoForm from "@/components/profile/ProfileInfoForm";
import ProfileNotificationSettings from "@/components/profile/ProfileNotificationSettings";
import SecuritySettings from "@/components/profile/SecuritySettings";
import ProfileAppearanceSettings from "@/components/profile/ProfileAppearanceSettings";
import DataManagement from "@/components/profile/DataManagement";

export default function Profile() {
  const { t, setLanguage } = useLanguage();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(userProfile);
  const [notifications, setNotifications] = useState(notificationPreferences);
  const [appearance, setAppearance] = useState(appearanceSettings);

  // Load appearance settings from localStorage and apply theme
  useEffect(() => {
    const saved = localStorage.getItem("luxa_appearance");
    if (saved) {
      const parsed = JSON.parse(saved);
      setAppearance(parsed);
      applyTheme(parsed.theme);
    } else {
      applyTheme(appearance.theme);
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

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast(t("Image size must be less than 2MB"));
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast(t("Please select an image file"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      const updatedProfile = { ...profile, avatar: imageData };
      setProfile(updatedProfile);
      localStorage.setItem("luxa_profile", JSON.stringify(updatedProfile));
      updateUser({ avatar: imageData });
      toast(t("Profile picture updated"));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    localStorage.setItem("luxa_profile", JSON.stringify(profile));
    toast(t("Profile updated successfully"));
  };

  const handleSaveNotifications = () => {
    localStorage.setItem("luxa_notifications", JSON.stringify(notifications));
    toast(t("Notification preferences saved"));
  };

  const handleSaveAppearance = () => {
    localStorage.setItem("luxa_appearance", JSON.stringify(appearance));
    applyTheme(appearance.theme);
    toast(t("Appearance settings saved"));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            {t("Profile & Settings")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("Manage your account settings and preferences")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Profile")}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Notifications")}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Security")}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Appearance")}</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Data")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <ProfileInfoForm
            profile={profile}
            onProfileChange={setProfile}
            onAvatarUpload={handleAvatarUpload}
            onSave={handleSaveProfile}
          />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <ProfileNotificationSettings
            notifications={notifications}
            onNotificationsChange={setNotifications}
            onSave={handleSaveNotifications}
          />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <SecuritySettings settings={securitySettings} />
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <ProfileAppearanceSettings
            appearance={appearance}
            onAppearanceChange={setAppearance}
            onThemeChange={applyTheme}
            onLanguageChange={() => {}}
            onSave={handleSaveAppearance}
          />
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <DataManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
