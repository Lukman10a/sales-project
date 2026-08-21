"use client";

import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfile } from "@/hooks/useProfile";
import type { NotificationPreferences } from "@/types/profileTypes";

interface NotificationSettingsProps {
  userRole: "owner" | "apprentice" | "investor";
}

type PrefKey = keyof NotificationPreferences;

export default function NotificationSettings({
  userRole,
}: NotificationSettingsProps) {
  const { t } = useLanguage();
  const {
    notificationPreferences,
    setNotificationPreferences,
    saveNotificationPreferences,
  } = useProfile();

  const handleToggle = (key: PrefKey, value: boolean) => {
    setNotificationPreferences((prev) => ({ ...prev, [key]: value }));
    // persist asynchronously
    setTimeout(() => {
      saveNotificationPreferences().catch(() => {});
    }, 0);
  };

  const ownerNotifications: Array<{
    title: string;
    description: string;
    key: PrefKey;
    defaultChecked: boolean;
  }> = [
    {
      title: "Sales Alerts",
      description: "Get notified when a sale is recorded",
      key: "newSales",
      defaultChecked: true,
    },
    {
      title: "Low Stock Warnings",
      description: "When items are running low",
      key: "lowStock",
      defaultChecked: true,
    },
    {
      title: "Discrepancy Alerts",
      description: "Stock mismatches",
      key: "teamActivity",
      defaultChecked: true,
    },
    {
      title: "AI Insights",
      description: "Business recommendations",
      key: "aiInsights",
      defaultChecked: false,
    },
    {
      title: "Daily Summary",
      description: "End of day sales summary",
      key: "reports",
      defaultChecked: false,
    },
  ];

  const apprenticeNotifications: Array<{
    title: string;
    description: string;
    key: PrefKey;
    defaultChecked: boolean;
  }> = [
    {
      title: "Product Additions",
      description: "New items to sell",
      key: "newSales",
      defaultChecked: true,
    },
    {
      title: "Price Updates",
      description: "Pricing changes",
      key: "reports",
      defaultChecked: true,
    },
    {
      title: "Stock Discrepancies",
      description: "Inventory mismatch alerts",
      key: "lowStock",
      defaultChecked: true,
    },
    {
      title: "Sales Targets",
      description: "Weekly sales performance",
      key: "reports",
      defaultChecked: false,
    },
  ];

  const investorNotifications: Array<{
    title: string;
    description: string;
    key: PrefKey;
    defaultChecked: boolean;
  }> = [
    {
      title: "Profit Updates",
      description: "Get notified about your monthly earnings",
      key: "reports",
      defaultChecked: true,
    },
    {
      title: "Withdrawal Status",
      description: "Updates on your withdrawal requests",
      key: "push",
      defaultChecked: true,
    },
    {
      title: "AI Insights",
      description: "Investment recommendations and analysis",
      key: "aiInsights",
      defaultChecked: true,
    },
    {
      title: "Business Updates",
      description: "Important business announcements",
      key: "teamActivity",
      defaultChecked: false,
    },
  ];

  const notifications =
    userRole === "investor"
      ? investorNotifications
      : userRole === "apprentice"
        ? apprenticeNotifications
        : ownerNotifications;

  return (
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
        {notifications.map((notification) => (
          <div
            key={notification.title}
            className="flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-foreground">
                {t(notification.title)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(notification.description)}
              </p>
            </div>
            <Switch
              checked={
                notificationPreferences[notification.key] ??
                notification.defaultChecked
              }
              onCheckedChange={(checked) =>
                handleToggle(notification.key, checked)
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}



