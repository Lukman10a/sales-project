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
import { toast } from "@/components/ui/sonner";

interface ProfileFormProps {
  profile: {
    name: string;
    email: string;
    phone: string;
    avatar: string;
    bio: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  onProfileChange: (profile: any) => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}

export default function ProfileForm({
  profile,
  onProfileChange,
  onAvatarUpload,
  onSave,
}: ProfileFormProps) {
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
              id="avatar-upload-investor"
              accept="image/*"
              className="hidden"
              onChange={onAvatarUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                document.getElementById("avatar-upload-investor")?.click()
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

          <div className="border-t pt-4">
            <h4 className="font-medium text-foreground mb-4">
              {t("Banking Information")}
            </h4>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bank-name">{t("Bank Name")}</Label>
                <Input
                  id="bank-name"
                  value={profile.bankName}
                  onChange={(e) =>
                    onProfileChange({ ...profile, bankName: e.target.value })
                  }
                  placeholder={t("e.g. First Bank")}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="account-number">{t("Account Number")}</Label>
                  <Input
                    id="account-number"
                    value={profile.accountNumber}
                    onChange={(e) =>
                      onProfileChange({
                        ...profile,
                        accountNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="account-name">{t("Account Name")}</Label>
                  <Input
                    id="account-name"
                    value={profile.accountName}
                    onChange={(e) =>
                      onProfileChange({
                        ...profile,
                        accountName: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
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


