import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Monitor } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface SecuritySettingsProps {
  settings: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
    activeSessions: number;
    loginHistory: Array<{
      id: string;
      timestamp: string;
      device: string;
      location: string;
      ipAddress: string;
      success: boolean;
    }>;
  };
}

export default function SecuritySettings({ settings }: SecuritySettingsProps) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader>
        <CardTitle>{t("Security Settings")}</CardTitle>
        <CardDescription>
          {t("Manage your password and security preferences")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label>{t("Two-Factor Authentication")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("Add an extra layer of security to your account")}
              </p>
              <Badge
                variant={settings.twoFactorEnabled ? "default" : "secondary"}
                className="mt-2"
              >
                {settings.twoFactorEnabled ? t("Enabled") : t("Disabled")}
              </Badge>
            </div>
            <Button variant="outline" size="sm">
              {settings.twoFactorEnabled ? t("Disable") : t("Enable")}
            </Button>
          </div>

          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("Change Password")}</Label>
              <Button variant="outline" size="sm" className="gap-2">
                <Lock className="w-4 h-4" />
                {t("Update")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("Last changed")}:{" "}
              {new Date(settings.lastPasswordChange).toLocaleDateString()}
            </p>
          </div>

          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("Active Sessions")}</Label>
              <Badge>
                {settings.activeSessions} {t("active")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("Manage devices that are currently logged in")}
            </p>
            <Button variant="outline" size="sm" className="w-full">
              {t("View All Sessions")}
            </Button>
          </div>
        </div>

        <div className="border-t pt-6">
          <h4 className="font-medium text-foreground mb-4">
            {t("Login History")}
          </h4>
          <div className="space-y-3">
            {settings.loginHistory.map((login) => (
              <div
                key={login.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      login.success ? "bg-success/10" : "bg-destructive/10",
                    )}
                  >
                    <Monitor
                      className={cn(
                        "w-4 h-4",
                        login.success ? "text-success" : "text-destructive",
                      )}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{login.device}</p>
                    <p className="text-xs text-muted-foreground">
                      {login.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {login.ipAddress}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={login.success ? "secondary" : "destructive"}
                    className="mb-1"
                  >
                    {login.success ? t("Success") : t("Failed")}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {new Date(login.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

