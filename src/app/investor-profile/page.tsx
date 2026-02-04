"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Bell,
  Palette,
  DollarSign,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import InvestmentStatsCard from "@/components/investor/InvestmentStatsCard";
import ProfileForm from "@/components/investor/ProfileForm";
import NotificationSettings from "@/components/investor/NotificationSettings";
import AppearanceSettings from "@/components/investor/AppearanceSettings";

export default function InvestorProfile() {
  const { t, formatCurrency, setLanguage } = useLanguage();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.firstName + " " + user?.lastName || "Investor",
    email: user?.email || "",
    phone: "",
    avatar: user?.avatar || "",
    bio: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    withdrawalStatus: true,
    monthlyReports: true,
    profitAlerts: true,
  });

  const [appearance, setAppearance] = useState({
    theme: "light",
    language: "en",
    currency: "NGN",
    compactMode: false,
  });

  // Load settings from localStorage and apply theme
  useEffect(() => {
    const savedProfile = localStorage.getItem("luxa_investor_profile");
    const savedNotifications = localStorage.getItem(
      "luxa_investor_notifications",
    );
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
      localStorage.setItem(
        "luxa_investor_profile",
        JSON.stringify(updatedProfile),
      );
      updateUser({ avatar: imageData });
      toast(t("Profile picture updated"));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    localStorage.setItem("luxa_investor_profile", JSON.stringify(profile));
    toast(t("Profile updated successfully"));
  };

  const handleSaveNotifications = () => {
    localStorage.setItem(
      "luxa_investor_notifications",
      JSON.stringify(notifications),
    );
    toast(t("Notification preferences saved"));
  };

  const handleSaveAppearance = () => {
    localStorage.setItem("luxa_appearance", JSON.stringify(appearance));
    applyTheme(appearance.theme);
    toast(t("Appearance settings saved"));
  };

  const investmentStats = [
    {
      label: "Total Invested",
      value: formatCurrency(500000),
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Total Returns",
      value: formatCurrency(125000),
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "ROI",
      value: "25%",
      icon: TrendingUp,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            {t("Investor Profile & Settings")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("Manage your investment profile and preferences")}
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-success/10 text-success border-success/20 w-fit"
        >
          {t("Investor")}
        </Badge>
      </div>

      {/* Investment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {investmentStats.map((stat) => (
          <InvestmentStatsCard key={stat.label} {...stat} />
        ))}
      </div>

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
          <ProfileForm
            profile={profile}
            onProfileChange={setProfile}
            onAvatarUpload={handleAvatarUpload}
            onSave={handleSaveProfile}
          />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings
            notifications={notifications}
            onNotificationsChange={setNotifications}
            onSave={handleSaveNotifications}
          />
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <AppearanceSettings
            appearance={appearance}
            onAppearanceChange={setAppearance}
            onThemeChange={applyTheme}
            onLanguageChange={setLanguage}
            onSave={handleSaveAppearance}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
