"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { settingSections } from "@/components/settings/settingsConfig";
import SettingsSidebar from "@/components/settings/SettingsSidebar";
import NotificationSettings from "@/components/settings/NotificationSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import DashboardCustomization from "@/components/settings/DashboardCustomization";
import DataBackupSettings from "@/components/settings/DataBackupSettings";
import HelpSupport from "@/components/settings/HelpSupport";
import StaffManagement from "@/components/settings/StaffManagement";
import {
  userPreferences,
  defaultQuickActions,
} from "@/data/dashboardCustomization";
import { useProfile } from "@/hooks/useProfile";
import { useTeamData } from "@/contexts/TeamDataContext";

export default function Settings() {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState("notifications");
  const { user } = useAuth();
  const userRole = user?.role || "owner";
  const {
    dashboardSettings,
    setDashboardSettings,
    saveDashboardSettings,
    appearanceSettings,
    setAppearanceSettings,
    saveAppearanceSettings,
  } = useProfile();
  const { teamMembers, inviteMember } = useTeamData();

  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    // prefer backend appearanceSettings when available, fallback to localStorage
    return localStorage.getItem("luxa_theme") || "dark";
  });

  useEffect(() => {
    if (appearanceSettings?.theme) {
      setTheme(appearanceSettings.theme === "system" ? "dark" : appearanceSettings.theme);
    }
  }, [appearanceSettings?.theme]);

  const selectedLayout = dashboardSettings?.layout ?? userPreferences.defaultView;
  const welcomeMessage = dashboardSettings?.showWelcomeMessage ?? userPreferences.showWelcomeMessage;
  const showTips = dashboardSettings?.showTips ?? userPreferences.showTips;
  const autoRefresh = dashboardSettings?.autoRefresh ?? userPreferences.autoRefresh;
  const refreshInterval =
    (dashboardSettings?.refreshInterval as "off" | "30s" | "1m" | "5m" | "15m" | "30m") ??
    userPreferences.refreshInterval;
  const quickActions =
    (dashboardSettings?.quickActions as unknown as import("@/types/dashboardCustomizationTypes").QuickAction[]) ??
    defaultQuickActions;

  // Filter settings sections based on user role
  const visibleSections = settingSections.filter((section) => {
    if (userRole === "apprentice") {
      return ["notifications", "appearance", "help"].includes(section.id);
    }
    return true;
  });

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("luxa_theme", newTheme);
    const mappedTheme = newTheme === "auto" ? "system" : (newTheme as "light" | "dark" | "system");
    setAppearanceSettings((prev) => ({ ...prev, theme: mappedTheme }));
    saveAppearanceSettings().catch(() => {});
  };

  const handleSaveDashboardSettings = async () => {
    try {
      await saveDashboardSettings();
      toast(t("Dashboard settings saved"));
    } catch {
      toast(t("Failed to save dashboard settings"));
    }
  };

  const handleAddStaff = (name: string, email: string) => {
    inviteMember({ name, email, role: "inventory", permissions: [] })
      .then(() => toast(t("Invitation sent")))
      .catch(() => toast(t("Failed to send invitation")));
  };

  const handleLayoutChange = (layout: string) => {
    setDashboardSettings((prev) => ({ ...prev, layout }));
  };
  const handleWelcomeMessageChange = (value: boolean) => {
    setDashboardSettings((prev) => ({ ...prev, showWelcomeMessage: value }));
  };
  const handleShowTipsChange = (value: boolean) => {
    setDashboardSettings((prev) => ({ ...prev, showTips: value }));
  };
  const handleAutoRefreshChange = (value: boolean) => {
    setDashboardSettings((prev) => ({ ...prev, autoRefresh: value }));
  };
  const handleRefreshIntervalChange = (value: "off" | "30s" | "1m" | "5m" | "15m" | "30m") => {
    setDashboardSettings((prev) => ({ ...prev, refreshInterval: value }));
  };
  const handleQuickActionsChange = (actions: import("@/types/dashboardCustomizationTypes").QuickAction[]) => {
    setDashboardSettings((prev) => ({ ...prev, quickActions: actions }));
  };

  const handleExportAll = () => {
    toast(t("Export started (mock)"));
  };

  const handleBackup = () => {
    toast(t("Backup triggered (mock)"));
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          {t("Settings")}
        </h1>
        <p className="text-muted-foreground">
          {t("Manage your account and preferences")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <SettingsSidebar
            sections={visibleSections}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-card rounded-xl border shadow-sm p-6"
          >
            {activeSection === "notifications" && (
              <NotificationSettings userRole={userRole} />
            )}

            {activeSection === "security" && <SecuritySettings />}

            {activeSection === "appearance" && (
              <AppearanceSettings
                theme={theme}
                onThemeChange={handleThemeChange}
              />
            )}

            {activeSection === "dashboard" && (
              <DashboardCustomization
                selectedLayout={selectedLayout}
                onLayoutChange={handleLayoutChange}
                welcomeMessage={welcomeMessage}
                onWelcomeMessageChange={handleWelcomeMessageChange}
                showTips={showTips}
                onShowTipsChange={handleShowTipsChange}
                autoRefresh={autoRefresh}
                onAutoRefreshChange={handleAutoRefreshChange}
                refreshInterval={refreshInterval}
                onRefreshIntervalChange={handleRefreshIntervalChange}
                quickActions={quickActions}
                onQuickActionsChange={handleQuickActionsChange}
                onSave={handleSaveDashboardSettings}
              />
            )}

            {activeSection === "data" && userRole === "owner" && (
              <DataBackupSettings
                onExportAll={handleExportAll}
                onBackup={handleBackup}
              />
            )}

            {activeSection === "help" && userRole === "owner" && (
              <HelpSupport />
            )}

            {activeSection === "staff" && userRole === "owner" && (
              <StaffManagement staff={teamMembers as unknown as import("@/components/settings/settingsConfig").StaffMember[]} onAddStaff={handleAddStaff} />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}


