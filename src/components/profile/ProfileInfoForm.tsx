import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileInfoFormProps {
  profile: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    city?: string;
    country?: string;
    bio?: string;
    avatar?: string;
  };
  onProfileChange: (profile: any) => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}

export default function ProfileInfoForm({
  profile,
  onProfileChange,
  onAvatarUpload,
  onSave,
}: ProfileInfoFormProps) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-xl border shadow-sm">
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
              id="avatar-upload"
              accept="image/*"
              className="hidden"
              onChange={onAvatarUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => document.getElementById("avatar-upload")?.click()}
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
          <div className="grid sm:grid-cols-2 gap-4">
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
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">{t("Phone")}</Label>
              <Input
                id="phone"
                value={profile.phone || ""}
                onChange={(e) =>
                  onProfileChange({ ...profile, phone: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">{t("Company")}</Label>
              <Input
                id="company"
                value={profile.company || ""}
                onChange={(e) =>
                  onProfileChange({ ...profile, company: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">{t("Address")}</Label>
            <Input
              id="address"
              value={profile.address || ""}
              onChange={(e) =>
                onProfileChange({ ...profile, address: e.target.value })
              }
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city">{t("City")}</Label>
              <Input
                id="city"
                value={profile.city || ""}
                onChange={(e) =>
                  onProfileChange({ ...profile, city: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">{t("Country")}</Label>
              <Input
                id="country"
                value={profile.country || ""}
                onChange={(e) =>
                  onProfileChange({ ...profile, country: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bio">{t("Bio")}</Label>
            <Textarea
              id="bio"
              rows={4}
              value={profile.bio || ""}
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

