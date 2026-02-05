import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";

interface MediaSectionProps {
  item: Omit<InventoryItem, "id">;
  onItemChange: (item: Omit<InventoryItem, "id">) => void;
}

export default function MediaSection({
  item,
  onItemChange,
}: MediaSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4 border-t pt-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t("Media")}
      </h3>
      <div className="grid gap-2">
        <Label htmlFor="image">{t("Image URL (optional)")}</Label>
        <Input
          id="image"
          placeholder="https://..."
          value={item.image}
          onChange={(e) => onItemChange({ ...item, image: e.target.value })}
        />
      </div>
    </div>
  );
}
