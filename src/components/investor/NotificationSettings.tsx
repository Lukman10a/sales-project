import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface NotificationSettingsProps {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    withdrawalStatus: boolean;
    monthlyReports: boolean;
    profitAlerts: boolean;
  };
  onNotificationsChange: (notifications: any) => void;
  onSave: () => void;
}

interface NotificationToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function NotificationToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: NotificationToggleProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{t(label)}</Label>
        <p className="text-sm text-muted-foreground">{t(description)}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function NotificationSettings({
  notifications,
  onNotificationsChange,
  onSave,
}: NotificationSettingsProps) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-xl border shadow-sm">
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
              id="withdrawal-status"
              label="Withdrawal Status"
              description="Updates on your withdrawal requests"
              checked={notifications.withdrawalStatus}
              onCheckedChange={(checked) =>
                onNotificationsChange({
                  ...notifications,
                  withdrawalStatus: checked,
                })
              }
            />
            <NotificationToggle
              id="monthly-reports"
              label="Monthly Reports"
              description="Receive monthly investment summaries"
              checked={notifications.monthlyReports}
              onCheckedChange={(checked) =>
                onNotificationsChange({
                  ...notifications,
                  monthlyReports: checked,
                })
              }
            />
            <NotificationToggle
              id="profit-alerts"
              label="Profit Alerts"
              description="Get notified about profit distributions"
              checked={notifications.profitAlerts}
              onCheckedChange={(checked) =>
                onNotificationsChange({
                  ...notifications,
                  profitAlerts: checked,
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


