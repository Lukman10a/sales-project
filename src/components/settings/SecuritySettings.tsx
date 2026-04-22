"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SecuritySettings() {
  const { t } = useLanguage();

  return (
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
          <Label htmlFor="currentPassword">{t("Current Password")}</Label>
          <Input id="currentPassword" type="password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">{t("New Password")}</Label>
          <Input id="newPassword" type="password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("Confirm Password")}</Label>
          <Input id="confirmPassword" type="password" />
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">{t("Update Password")}</Button>
      </div>
    </div>
  );
}



