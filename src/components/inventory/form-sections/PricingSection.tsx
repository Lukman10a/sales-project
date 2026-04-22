import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";

interface PricingSectionProps {
  item: Omit<InventoryItem, "id">;
  onItemChange: (item: Omit<InventoryItem, "id">) => void;
  validation?: {
    priceError?: string;
  };
}

export default function PricingSection({
  item,
  onItemChange,
  validation,
}: PricingSectionProps) {
  const { t } = useLanguage();

  const markup =
    item.wholesalePrice > 0
      ? ((item.sellingPrice - item.wholesalePrice) / item.wholesalePrice) * 100
      : 0;
  const profitMargin =
    item.sellingPrice > 0
      ? ((item.sellingPrice - item.wholesalePrice) / item.sellingPrice) * 100
      : 0;

  const getMarginColor = (margin: number) => {
    if (margin < 10) return "text-destructive";
    if (margin < 20) return "text-warning";
    return "text-success";
  };

  return (
    <div className="space-y-4 border-t pt-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t("Pricing")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="wholesale">{t("Cost Price (NGN)")}</Label>
          <Input
            id="wholesale"
            type="number"
            min={0}
            value={item.wholesalePrice}
            onChange={(e) =>
              onItemChange({
                ...item,
                wholesalePrice: Number(e.target.value) || 0,
              })
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="selling">{t("Selling Price (NGN)")}</Label>
          <Input
            id="selling"
            type="number"
            min={0}
            value={item.sellingPrice}
            onChange={(e) =>
              onItemChange({
                ...item,
                sellingPrice: Number(e.target.value) || 0,
              })
            }
          />
          {validation?.priceError && (
            <p className="text-xs text-destructive">{validation.priceError}</p>
          )}
        </div>
      </div>
      {item.wholesalePrice > 0 && item.sellingPrice > item.wholesalePrice && (
        <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-4 grid grid-cols-2 gap-4 border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("Markup")}</p>
            <p className={`text-2xl font-bold ${getMarginColor(markup)}`}>
              {markup.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {t("Profit Margin")}
            </p>
            <p className={`text-2xl font-bold ${getMarginColor(profitMargin)}`}>
              {profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


