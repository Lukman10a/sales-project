"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
}

interface ProfileSectionProps {
  profile: ProfileData;
  onProfileChange: (profile: ProfileData) => void;
  onSave: () => void;
}

export default function ProfileSection({
  profile,
  onProfileChange,
  onSave,
}: ProfileSectionProps) {
  const { t } = useLanguage();
  const { updateUser } = useAuth();

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast(t("Image size must be less than 2MB"));
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast(t("Please select an image file"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      const updated = { ...profile, avatar: imageData };
      onProfileChange(updated);
      updateUser({ avatar: imageData });
      toast(t("Profile picture updated"));
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{t("Personal Information")}</CardTitle>
        <CardDescription>
          {t("Update your personal details and profile picture")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar} alt={profile.name} />
            <AvatarFallback className="text-2xl">
              {profile.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <input
              type="file"
              id="avatar-upload-staff"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                document.getElementById("avatar-upload-staff")?.click()
              }
            >
              <Camera className="w-4 h-4" />
              {t("Change Photo")}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              {t("JPG, PNG or GIF. Max size 2MB")}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("Full Name")}</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) =>
                onProfileChange({ ...profile, name: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">{t("Email")}</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) =>
                onProfileChange({ ...profile, email: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">{t("Phone")}</Label>
            <Input
              id="phone"
              value={profile.phone}
              onChange={(e) =>
                onProfileChange({ ...profile, phone: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bio">{t("Bio")}</Label>
            <Textarea
              id="bio"
              rows={4}
              value={profile.bio}
              onChange={(e) =>
                onProfileChange({ ...profile, bio: e.target.value })
              }
              placeholder={t("Tell us about yourself...")}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} className="gap-2">
            <Save className="w-4 h-4" />
            {t("Save Changes")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


