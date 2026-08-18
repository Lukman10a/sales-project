"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface AppearanceSettingsProps {
  theme: string;
  onThemeChange: (theme: string) => void;
}

export default function AppearanceSettings({
  theme,
  onThemeChange,
}: AppearanceSettingsProps) {
  const { t, language, toggleLanguage } = useLanguage();

  return (
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
          <p className="font-medium text-foreground mb-3">{t("Theme")}</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => onThemeChange("light")}
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
              onClick={() => onThemeChange("dark")}
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
              onClick={() => onThemeChange("auto")}
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
          <p className="font-medium text-foreground mb-3">{t("Language")}</p>
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
  );
}



