"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  settingSections,
  StaffMember,
} from "@/components/settings/settingsConfig";
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
import { QuickAction } from "@/types/dashboardCustomizationTypes";

export default function Settings() {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState("notifications");
  const { user } = useAuth();
  const userRole = user?.role || "owner";
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("luxa_theme") || "dark";
  });
  const [staff, setStaff] = useState<StaffMember[]>([
    {
      id: "1",
      name: "Ibrahim Musa",
      email: "ibrahim@luxa.com",
      role: "admin",
      status: "active",
    },
    {
      id: "2",
      name: "Salim Adeyemi",
      email: "salim@luxa.com",
      role: "admin",
      status: "invited",
    },
  ]);
  const [selectedLayout, setSelectedLayout] = useState(
    userPreferences.defaultView,
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    userPreferences.showWelcomeMessage,
  );
  const [showTips, setShowTips] = useState(userPreferences.showTips);
  const [autoRefresh, setAutoRefresh] = useState(userPreferences.autoRefresh);
  const [refreshInterval, setRefreshInterval] = useState(
    userPreferences.refreshInterval,
  );
  const [quickActions, setQuickActions] =
    useState<QuickAction[]>(defaultQuickActions);

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
  };

  const handleSaveDashboardSettings = () => {
    toast(t("Dashboard settings saved locally (no backend yet)"));
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
                onLayoutChange={setSelectedLayout}
                welcomeMessage={welcomeMessage}
                onWelcomeMessageChange={setWelcomeMessage}
                showTips={showTips}
                onShowTipsChange={setShowTips}
                autoRefresh={autoRefresh}
                onAutoRefreshChange={setAutoRefresh}
                refreshInterval={refreshInterval}
                onRefreshIntervalChange={setRefreshInterval}
                quickActions={quickActions}
                onQuickActionsChange={setQuickActions}
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
              <StaffManagement staff={staff} />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}


