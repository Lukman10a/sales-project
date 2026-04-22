"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface NotificationsData {
  email: boolean;
  push: boolean;
  sms: boolean;
  stockAlerts: boolean;
  newProducts: boolean;
  priceUpdates: boolean;
}

interface NotificationsSectionProps {
  notifications: NotificationsData;
  onNotificationsChange: (notifications: NotificationsData) => void;
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notif">{t("Email Notifications")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("Receive notifications via email")}
                </p>
              </div>
              <Switch
                id="email-notif"
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  onNotificationsChange({ ...notifications, email: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notif">{t("Push Notifications")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("Receive push notifications in browser")}
                </p>
              </div>
              <Switch
                id="push-notif"
                checked={notifications.push}
                onCheckedChange={(checked) =>
                  onNotificationsChange({ ...notifications, push: checked })
                }
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6 space-y-4">
          <h4 className="font-medium text-foreground">
            {t("Notification Types")}
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="stock-alerts">{t("Stock Alerts")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("Get notified about stock level changes")}
                </p>
              </div>
              <Switch
                id="stock-alerts"
                checked={notifications.stockAlerts}
                onCheckedChange={(checked) =>
                  onNotificationsChange({
                    ...notifications,
                    stockAlerts: checked,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="new-products">
                  {t("New Product Additions")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("Notifications for new inventory items")}
                </p>
              </div>
              <Switch
                id="new-products"
                checked={notifications.newProducts}
                onCheckedChange={(checked) =>
                  onNotificationsChange({
                    ...notifications,
                    newProducts: checked,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="price-updates">{t("Price Updates")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("Get notified when prices change")}
                </p>
              </div>
              <Switch
                id="price-updates"
                checked={notifications.priceUpdates}
                onCheckedChange={(checked) =>
                  onNotificationsChange({
                    ...notifications,
                    priceUpdates: checked,
                  })
                }
              />
            </div>
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


