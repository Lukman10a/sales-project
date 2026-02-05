import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";

interface InventorySectionProps {
  item: Omit<InventoryItem, "id">;
  onItemChange: (item: Omit<InventoryItem, "id">) => void;
  validation?: {
    reorderError?: string;
  };
}

export default function InventorySection({
  item,
  onItemChange,
  validation,
}: InventorySectionProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4 border-t pt-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t("Inventory")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="reorderPoint">{t("Minimum Reorder Quantity")}</Label>
          <Input
            id="reorderPoint"
            type="number"
            min={0}
            value={item.reorderPoint ?? 0}
            onChange={(e) =>
              onItemChange({
                ...item,
                reorderPoint: Number(e.target.value) || 0,
              })
            }
          />
          {validation?.reorderError && (
            <p className="text-xs text-destructive">
              {validation.reorderError}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="qty">{t("Quantity")}</Label>
          <Input
            id="qty"
            type="number"
            min={0}
            value={item.quantity}
            onChange={(e) =>
              onItemChange({
                ...item,
                quantity: Number(e.target.value) || 0,
              })
            }
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("Status")}</Label>
          <Select
            value={item.status}
            onValueChange={(value: InventoryItem["status"]) =>
              onItemChange({
                ...item,
                status: value as InventoryItem["status"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("Select status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in-stock">{t("In Stock")}</SelectItem>
              <SelectItem value="low-stock">{t("Low Stock")}</SelectItem>
              <SelectItem value="out-of-stock">{t("Out of Stock")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
