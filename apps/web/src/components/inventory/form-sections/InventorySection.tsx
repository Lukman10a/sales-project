import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";

interface InventorySectionProps {
  item: Omit<InventoryItem, "id">;
  onItemChange: (item: Omit<InventoryItem, "id">) => void;
  /** Editing: stock is shown but changed only by Restock / Adjust. */
  stockLocked?: boolean;
  validation?: {
    reorderError?: string;
  };
}

export default function InventorySection({
  item,
  onItemChange,
  stockLocked = false,
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
          <Label htmlFor="qty">
            {stockLocked ? t("Quantity in stock") : t("Opening stock")}
          </Label>
          <Input
            id="qty"
            type="number"
            min={0}
            disabled={stockLocked}
            value={item.quantity}
            onChange={(e) =>
              onItemChange({
                ...item,
                quantity: Number(e.target.value) || 0,
              })
            }
          />
          {stockLocked && (
            <p className="text-xs text-muted-foreground">
              {t("Use Change stock to restock or adjust")}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="expiryDate">{t("Expiry date")}</Label>
          <Input
            id="expiryDate"
            type="date"
            value={item.expiryDate ?? ""}
            onChange={(e) =>
              onItemChange({
                ...item,
                expiryDate: e.target.value,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}


