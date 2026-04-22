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
import { cn } from "@/lib/utils";

interface ProfileAppearanceSettingsProps {
  appearance: {
    theme: string;
    language: string;
    currency: string;
    dateFormat: string;
    timeFormat: string;
    compactMode: boolean;
  };
  onAppearanceChange: (appearance: any) => void;
  onThemeChange: (theme: string) => void;
  onLanguageChange: (language: string) => void;
  onSave: () => void;
}

export default function ProfileAppearanceSettings({
  appearance,
  onAppearanceChange,
  onThemeChange,
  onLanguageChange,
  onSave,
}: ProfileAppearanceSettingsProps) {
  const { t, setLanguage } = useLanguage();

  const handleLanguageChange = (lang: string) => {
    onAppearanceChange({ ...appearance, language: lang });
    setLanguage(lang as "en" | "ar");
    onLanguageChange(lang);
  };

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader>
        <CardTitle>{t("Appearance Settings")}</CardTitle>
        <CardDescription>
          {t("Customize how the application looks and feels")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-6">
          <div>
            <Label className="mb-3 block">{t("Theme")}</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  onAppearanceChange({ ...appearance, theme: "light" });
                  onThemeChange("light");
                }}
                className={cn(
                  "p-4 border-2 rounded-xl transition-all",
                  appearance.theme === "light"
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50",
                )}
              >
                <div className="w-full h-16 bg-white rounded-lg mb-2 border" />
                <p className="text-sm font-medium">{t("Light")}</p>
              </button>
              <button
                onClick={() => {
                  onAppearanceChange({ ...appearance, theme: "dark" });
                  onThemeChange("dark");
                }}
                className={cn(
                  "p-4 border-2 rounded-xl transition-all",
                  appearance.theme === "dark"
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50",
                )}
              >
                <div className="w-full h-16 bg-slate-900 rounded-lg mb-2 border" />
                <p className="text-sm font-medium">{t("Dark")}</p>
              </button>
              <button
                onClick={() => {
                  onAppearanceChange({ ...appearance, theme: "system" });
                  onThemeChange("system");
                }}
                className={cn(
                  "p-4 border-2 rounded-xl transition-all",
                  appearance.theme === "system"
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50",
                )}
              >
                <div className="w-full h-16 bg-gradient-to-r from-white to-slate-900 rounded-lg mb-2 border" />
                <p className="text-sm font-medium">{t("System")}</p>
              </button>
            </div>
          </div>

          <div>
            <Label className="mb-3 block">{t("Language")}</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={appearance.language === "en" ? "default" : "outline"}
                className="flex-1"
                onClick={() => handleLanguageChange("en")}
              >
                English
              </Button>
              <Button
                variant={appearance.language === "ar" ? "default" : "outline"}
                className="flex-1"
                onClick={() => handleLanguageChange("ar")}
              >
                العربية
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-3 block">{t("Currency")}</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={appearance.currency === "NGN" ? "default" : "outline"}
                onClick={() =>
                  onAppearanceChange({ ...appearance, currency: "NGN" })
                }
              >
                ₦ Naira (NGN)
              </Button>
              <Button
                variant={appearance.currency === "USD" ? "default" : "outline"}
                onClick={() =>
                  onAppearanceChange({ ...appearance, currency: "USD" })
                }
              >
                $ Dollar (USD)
              </Button>
              <Button
                variant={appearance.currency === "EUR" ? "default" : "outline"}
                onClick={() =>
                  onAppearanceChange({ ...appearance, currency: "EUR" })
                }
              >
                € Euro (EUR)
              </Button>
              <Button
                variant={appearance.currency === "GBP" ? "default" : "outline"}
                onClick={() =>
                  onAppearanceChange({ ...appearance, currency: "GBP" })
                }
              >
                £ Pound (GBP)
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-3 block">{t("Date Format")}</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={
                  appearance.dateFormat === "DD/MM/YYYY" ? "default" : "outline"
                }
                onClick={() =>
                  onAppearanceChange({
                    ...appearance,
                    dateFormat: "DD/MM/YYYY",
                  })
                }
              >
                DD/MM/YYYY
              </Button>
              <Button
                variant={
                  appearance.dateFormat === "MM/DD/YYYY" ? "default" : "outline"
                }
                onClick={() =>
                  onAppearanceChange({
                    ...appearance,
                    dateFormat: "MM/DD/YYYY",
                  })
                }
              >
                MM/DD/YYYY
              </Button>
              <Button
                variant={
                  appearance.dateFormat === "YYYY-MM-DD" ? "default" : "outline"
                }
                onClick={() =>
                  onAppearanceChange({
                    ...appearance,
                    dateFormat: "YYYY-MM-DD",
                  })
                }
              >
                YYYY-MM-DD
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-3 block">{t("Time Format")}</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={
                  appearance.timeFormat === "12h" ? "default" : "outline"
                }
                onClick={() =>
                  onAppearanceChange({ ...appearance, timeFormat: "12h" })
                }
              >
                {t("12-hour")}
              </Button>
              <Button
                variant={
                  appearance.timeFormat === "24h" ? "default" : "outline"
                }
                onClick={() =>
                  onAppearanceChange({ ...appearance, timeFormat: "24h" })
                }
              >
                {t("24-hour")}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="compact-mode">{t("Compact Mode")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("Reduce spacing and padding throughout the app")}
              </p>
            </div>
            <Switch
              id="compact-mode"
              checked={appearance.compactMode}
              onCheckedChange={(checked) =>
                onAppearanceChange({ ...appearance, compactMode: checked })
              }
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onSave} className="gap-2">
            <Save className="w-4 h-4" />
            {t("Save Changes")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

