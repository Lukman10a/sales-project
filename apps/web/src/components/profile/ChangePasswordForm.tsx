"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChangePasswordFormProps {
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export default function ChangePasswordForm({
  onChangePassword,
}: ChangePasswordFormProps) {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast(t("Please fill in all fields"));
      return;
    }
    if (newPassword.length < 8) {
      toast(t("Password must be at least 8 characters"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast(t("Passwords do not match"));
      return;
    }
    if (currentPassword === newPassword) {
      toast(t("New password must be different from current password"));
      return;
    }

    setIsSubmitting(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      toast(t("Password changed successfully"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast(
        error instanceof Error && error.message
          ? error.message
          : t("Failed to change password"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader>
        <CardTitle>{t("Change Password")}</CardTitle>
        <CardDescription>
          {t("Update your password to keep your account secure")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="current-password">{t("Current Password")}</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-password">{t("New Password")}</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-password">{t("Confirm Password")}</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2"
          >
            <Lock className="w-4 h-4" />
            {isSubmitting ? t("Updating...") : t("Update Password")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}