"use client";

import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toProfileUpdate } from "@/lib/api/payloads";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Shield, Palette, Database } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { securitySettings } from "@/data/profile";
import ProfileInfoForm from "@/components/profile/ProfileInfoForm";
import ProfileNotificationSettings from "@/components/profile/ProfileNotificationSettings";
import SecuritySettings from "@/components/profile/SecuritySettings";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import ProfileAppearanceSettings from "@/components/profile/ProfileAppearanceSettings";
import DataManagement from "@/components/profile/DataManagement";

export default function Profile() {
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
    changePassword,
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

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
        <div className="bg-card rounded-xl border shadow-sm p-6 space-y-4 animate-pulse">
          <div className="h-16 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted/70 rounded w-3/4" />
          <div className="h-4 bg-muted/70 rounded w-1/2" />
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
            notifications={notificationPreferences}
            onNotificationsChange={setNotificationPreferences}
            onSave={handleSaveNotifications}
          />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <SecuritySettings settings={securitySettings} />
          <ChangePasswordForm onChangePassword={changePassword} />
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <ProfileAppearanceSettings
            appearance={appearanceSettings}
            onAppearanceChange={setAppearanceSettings}
            onThemeChange={applyTheme}
            onLanguageChange={(lang) => setLanguage(lang as "en" | "ar")}
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