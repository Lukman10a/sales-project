"use client";

import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";

interface NotificationSettingsProps {
  userRole: "owner" | "apprentice" | "investor";
}

export default function NotificationSettings({
  userRole,
}: NotificationSettingsProps) {
  const { t } = useLanguage();

  const ownerNotifications = [
    {
      title: "Sales Alerts",
      description: "Get notified when a sale is recorded",
      defaultChecked: true,
    },
    {
      title: "Low Stock Warnings",
      description: "When items are running low",
      defaultChecked: true,
    },
    {
      title: "Discrepancy Alerts",
      description: "Stock mismatches",
      defaultChecked: true,
    },
    {
      title: "AI Insights",
      description: "Business recommendations",
      defaultChecked: false,
    },
    {
      title: "Daily Summary",
      description: "End of day sales summary",
      defaultChecked: false,
    },
  ];

  const apprenticeNotifications = [
    {
      title: "Product Additions",
      description: "New items to sell",
      defaultChecked: true,
    },
    {
      title: "Price Updates",
      description: "Pricing changes",
      defaultChecked: true,
    },
    {
      title: "Stock Discrepancies",
      description: "Inventory mismatch alerts",
      defaultChecked: true,
    },
    {
      title: "Sales Targets",
      description: "Weekly sales performance",
      defaultChecked: false,
    },
  ];

  const investorNotifications = [
    {
      title: "Profit Updates",
      description: "Get notified about your monthly earnings",
      defaultChecked: true,
    },
    {
      title: "Withdrawal Status",
      description: "Updates on your withdrawal requests",
      defaultChecked: true,
    },
    {
      title: "AI Insights",
      description: "Investment recommendations and analysis",
      defaultChecked: true,
    },
    {
      title: "Business Updates",
      description: "Important business announcements",
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
            <Switch defaultChecked={notification.defaultChecked} />
          </div>
        ))}
      </div>
    </div>
  );
}



