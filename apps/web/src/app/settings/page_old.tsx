"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  HelpCircle,
  Users,
  ChevronRight,
  Upload,
  Layout,
} from "lucide-react";
import {
  dashboardLayouts,
  widgetCatalog,
  userPreferences,
  defaultQuickActions,
  savedViews,
} from "@/data/dashboardCustomization";
import { QuickAction } from "@/types/dashboardCustomizationTypes";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const settingSections = [
  {
    id: "notifications",
    title: "Notifications",
    description: "Configure alert preferences",
    icon: Bell,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Customize your dashboard",
    icon: Layout,
  },
  {
    id: "security",
    title: "Security",
    description: "Password and authentication",
    icon: Shield,
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Customize the app look",
    icon: Palette,
  },
  {
    id: "data",
    title: "Data & Backup",
    description: "Export and backup options",
    icon: Database,
  },
  {
    id: "help",
    title: "Help & Support",
    description: "Get help and documentation",
    icon: HelpCircle,
  },
  {
    id: "staff",
    title: "Staff & Invitations",
    description: "Invite and manage your staff",
    icon: Users,
  },
];

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: "admin";
  status: "active" | "invited";
};

export default function Settings() {
  const { t, language, toggleLanguage } = useLanguage();
  const [activeSection, setActiveSection] = useState("notifications");
  const { user } = useAuth();
  const userRole = user?.role || "owner";
  const [profileImage, setProfileImage] = useState(user?.avatar || "");
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
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [selectedLayout, setSelectedLayout] = useState(
    userPreferences.defaultView,
  );

  // Filter settings sections based on user role
  const visibleSections = settingSections.filter((section) => {
    if (userRole === "apprentice") {
      // Apprentices can only access: notifications, appearance, help
      return ["notifications", "appearance", "help"].includes(section.id);
    }
    return true; // Owners see all sections
  });
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

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setProfileImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

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

  const userDisplayName = user ? `${user.firstName} ${user.lastName}` : "User";
  const userInitials = user ? `${user.firstName[0]}${user.lastName[0]}` : "U";

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
          <nav className="space-y-1">
            {visibleSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <section.icon className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{t(section.title)}</p>
                </div>
                <ChevronRight
                  className={cn(
                    "w-4 h-4",
                    activeSection === section.id && "text-primary-foreground",
                  )}
                />
              </button>
            ))}
          </nav>
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
              <div className="space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-xl text-foreground mb-1">
                    {t("Notification Preferences")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("Choose what notifications you receive")}
                  </p>
                </div>
                <Separator />
                <div className="space-y-6">
                  {userRole === "apprentice" ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {t("Product Additions")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("New items to sell")}
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {t("Price Updates")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("Pricing changes")}
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {t("Stock Discrepancies")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("Inventory mismatch alerts")}
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {t("Sales Targets")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("Weekly sales performance")}
                          </p>
                        </div>
                        <Switch />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {t("Sales Alerts")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("Get notified when a sale is recorded")}
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {t("Low Stock Warnings")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("When items are running low")}
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {t("Discrepancy Alerts")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("Stock mismatches")}
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {t("AI Insights")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("Business recommendations")}
                          </p>
                        </div>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {t("Daily Summary")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("End of day sales summary")}
                          </p>
                        </div>
                        <Switch />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeSection === "security" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-xl text-foreground mb-1">
                    {t("Security")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("Password and authentication")}
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">
                      {t("Current Password")}
                    </Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t("New Password")}</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      {t("Confirm Password")}
                    </Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                  <Button className="bg-gradient-accent">
                    {t("Update Password")}
                  </Button>
                </div>
              </div>
            )}

            {activeSection === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-xl text-foreground mb-1">
                    {t("Appearance Settings")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("Customize the app appearance and theme")}
                  </p>
                </div>
                <Separator />
                <div className="space-y-6">
                  <div>
                    <p className="font-medium text-foreground mb-3">
                      {t("Theme")}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => handleThemeChange("light")}
                        className={cn(
                          "p-4 border-2 rounded-xl transition-all",
                          theme === "light"
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-accent/50",
                        )}
                      >
                        <div className="w-full h-16 bg-white rounded-lg mb-2 border" />
                        <p className="text-sm font-medium">{t("Light")}</p>
                      </button>
                      <button
                        onClick={() => handleThemeChange("dark")}
                        className={cn(
                          "p-4 border-2 rounded-xl transition-all",
                          theme === "dark"
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-accent/50",
                        )}
                      >
                        <div className="w-full h-16 bg-slate-900 rounded-lg mb-2 border" />
                        <p className="text-sm font-medium">{t("Dark")}</p>
                      </button>
                      <button
                        onClick={() => handleThemeChange("auto")}
                        className={cn(
                          "p-4 border-2 rounded-xl transition-all",
                          theme === "auto"
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-accent/50",
                        )}
                      >
                        <div className="w-full h-16 bg-gradient-to-r from-white to-slate-900 rounded-lg mb-2 border" />
                        <p className="text-sm font-medium">{t("Auto")}</p>
                      </button>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="font-medium text-foreground mb-3">
                      {t("Language")}
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant={language === "en" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => {
                          if (language !== "en") toggleLanguage();
                        }}
                      >
                        English
                      </Button>
                      <Button
                        variant={language === "ar" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => {
                          if (language !== "ar") toggleLanguage();
                        }}
                      >
                        العربية
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "dashboard" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-xl text-foreground mb-1">
                    {t("Dashboard Customization")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("Choose your layout, widgets, and preferences")}
                  </p>
                </div>
                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-xl bg-card">
                    <p className="font-medium mb-3 flex items-center gap-2">
                      <Layout className="w-4 h-4" />
                      {t("Layout Template")}
                    </p>
                    <div className="space-y-3">
                      {dashboardLayouts.map((layout) => (
                        <button
                          key={layout.id}
                          onClick={() => setSelectedLayout(layout.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-colors",
                            selectedLayout === layout.id
                              ? "border-accent bg-accent/5"
                              : "border-border hover:border-accent/60",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-foreground">
                                {layout.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {layout.description}
                              </p>
                            </div>
                            {layout.isDefault && (
                              <Badge variant="outline">{t("Default")}</Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 border rounded-xl bg-card">
                    <p className="font-medium mb-3 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      {t("Auto Refresh")}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {t("Enable auto refresh")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("Keep dashboard widgets up to date")}
                          </p>
                        </div>
                        <Switch
                          checked={autoRefresh}
                          onCheckedChange={setAutoRefresh}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("Refresh interval")}</Label>
                        <Select
                          value={refreshInterval}
                          onValueChange={(value) =>
                            setRefreshInterval(value as typeof refreshInterval)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30s">30s</SelectItem>
                            <SelectItem value="1m">1m</SelectItem>
                            <SelectItem value="5m">5m</SelectItem>
                            <SelectItem value="15m">15m</SelectItem>
                            <SelectItem value="30m">30m</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {t("Welcome message")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("Show greeting on dashboard load")}
                          </p>
                        </div>
                        <Switch
                          checked={welcomeMessage}
                          onCheckedChange={setWelcomeMessage}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {t("Tips & guides")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("Contextual tips for new users")}
                          </p>
                        </div>
                        <Switch
                          checked={showTips}
                          onCheckedChange={setShowTips}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-xl bg-card">
                    <p className="font-medium mb-3">{t("Quick Actions")}</p>
                    <div className="space-y-2">
                      {quickActions.map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {action.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {action.action}
                            </p>
                          </div>
                          <Switch
                            checked={action.enabled}
                            onCheckedChange={(checked) =>
                              setQuickActions((prev) =>
                                prev.map((qa) =>
                                  qa.id === action.id
                                    ? { ...qa, enabled: checked }
                                    : qa,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 border rounded-xl bg-card">
                    <p className="font-medium mb-3">{t("Saved Views")}</p>
                    <div className="space-y-2">
                      {savedViews.map((view) => (
                        <div
                          key={view.id}
                          className="p-3 border rounded-lg flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-sm">{view.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {view.description || t("No description")}
                            </p>
                          </div>
                          {view.isDefault && (
                            <Badge variant="outline">{t("Default")}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-xl bg-card">
                  <p className="font-medium mb-3">{t("Available Widgets")}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {widgetCatalog.slice(0, 6).map((widget) => (
                      <div key={widget.type} className="p-3 border rounded-lg">
                        <p className="font-semibold text-sm">{widget.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {widget.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">{widget.category}</Badge>
                          <Badge variant="outline">{widget.defaultSize}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="bg-gradient-accent"
                    onClick={handleSaveDashboardSettings}
                  >
                    {t("Save Dashboard Settings")}
                  </Button>
                </div>
              </div>
            )}

            {activeSection === "data" && userRole === "owner" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-xl text-foreground mb-1">
                    {t("Data & Backup")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("Export and backup options")}
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleExportAll}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {t("Export All Data")}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleBackup}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {t("Backup to Cloud")}
                  </Button>
                </div>
              </div>
            )}

            {activeSection === "help" && userRole === "owner" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-xl text-foreground mb-1">
                    {t("Help & Support")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("Get help and documentation")}
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    {t("Documentation")}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    {t("Contact Support")}
                  </Button>
                </div>
              </div>
            )}

            {activeSection === "staff" && userRole === "owner" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-xl text-foreground mb-1">
                    {t("Staff & Invitations")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("Invite and manage your staff")}
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  {staff.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                      <Badge
                        variant={
                          member.status === "active" ? "default" : "secondary"
                        }
                      >
                        {member.status}
                      </Badge>
                    </div>
                  ))}
                  <Separator />
                  <div className="space-y-3">
                    <Input
                      placeholder={t("Staff Name")}
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                    />
                    <Input
                      placeholder={t("Staff Email")}
                      type="email"
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                    />
                    <Button className="w-full bg-gradient-accent">
                      {t("Send Invitation")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}


