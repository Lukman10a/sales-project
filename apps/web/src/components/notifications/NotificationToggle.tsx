import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";

interface NotificationToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function NotificationToggle({
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