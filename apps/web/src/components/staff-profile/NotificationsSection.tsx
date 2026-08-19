"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { NotificationToggle } from "@/components/notifications/NotificationToggle";
import type { NotificationPreferences } from "@/types/profileTypes";

interface NotificationsSectionProps {
  notifications: NotificationPreferences;
  onNotificationsChange: (notifications: NotificationPreferences) => void;
  onSave: () => void;
}

export default function NotificationsSection({
  notifications,
  onNotificationsChange,
  onSave,
}: NotificationsSectionProps) {
  const { t } = useLanguage();

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{t("Notification Preferences")}</CardTitle>
        <CardDescription>
          {t("Choose how you want to receive notifications")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">
            {t("Notification Channels")}
          </h4>
          <div className="space-y-4">
            <NotificationToggle
              id="email-notif"
              label="Email Notifications"
              description="Receive notifications via email"
              checked={notifications.email}
              onCheckedChange={(checked) =>
                onNotificationsChange({ ...notifications, email: checked })
              }
            />
            <NotificationToggle
              id="push-notif"
              label="Push Notifications"
              description="Receive push notifications in browser"
              checked={notifications.push}
              onCheckedChange={(checked) =>
                onNotificationsChange({ ...notifications, push: checked })
              }
            />
            <NotificationToggle
              id="sms-notif"
              label="SMS Notifications"
              description="Receive notifications via SMS"
              checked={notifications.sms}
              onCheckedChange={(checked) =>
                onNotificationsChange({ ...notifications, sms: checked })
              }
            />
          </div>
        </div>

        <div className="border-t pt-6 space-y-4">
          <h4 className="font-medium text-foreground">
            {t("Notification Types")}
          </h4>
          <div className="space-y-4">
            <NotificationToggle
              id="low-stock"
              label="Low Stock Alerts"
              description="Get notified when inventory is running low"
              checked={notifications.lowStock}
              onCheckedChange={(checked) =>
                onNotificationsChange({ ...notifications, lowStock: checked })
              }
            />
            <NotificationToggle
              id="new-sales"
              label="New Sales"
              description="Notifications for new sales transactions"
              checked={notifications.newSales}
              onCheckedChange={(checked) =>
                onNotificationsChange({ ...notifications, newSales: checked })
              }
            />
            <NotificationToggle
              id="reports"
              label="Report Generation"
              description="Notifications when reports are ready"
              checked={notifications.reports}
              onCheckedChange={(checked) =>
                onNotificationsChange({ ...notifications, reports: checked })
              }
            />
            <NotificationToggle
              id="team-activity"
              label="Team Activity"
              description="Updates on team member actions"
              checked={notifications.teamActivity}
              onCheckedChange={(checked) =>
                onNotificationsChange({
                  ...notifications,
                  teamActivity: checked,
                })
              }
            />
            <NotificationToggle
              id="ai-insights"
              label="AI Insights"
              description="Get notified about AI-generated insights"
              checked={notifications.aiInsights}
              onCheckedChange={(checked) =>
                onNotificationsChange({
                  ...notifications,
                  aiInsights: checked,
                })
              }
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onSave} className="gap-2">
            <Save className="w-4 h-4" />
            {t("Save Preferences")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}