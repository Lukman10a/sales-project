import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";

interface BundlePricingSectionProps {
  item: Omit<InventoryItem, "id">;
  onItemChange: (item: Omit<InventoryItem, "id">) => void;
}

export default function BundlePricingSection({
  item,
  onItemChange,
}: BundlePricingSectionProps) {
  const { t } = useLanguage();

  const bundleDiscount =
    item.cartonSize && item.cartonPrice
      ? ((item.cartonSize * item.sellingPrice - item.cartonPrice) /
          (item.cartonSize * item.sellingPrice)) *
        100
      : 0;

  return (
    <div className="space-y-4 border-t pt-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("Bundle Pricing")}{" "}
          <span className="text-xs normal-case">({t("optional")})</span>
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t("Offer discounts for bulk purchases")}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="bundleQty">{t("Bundle Quantity")}</Label>
          <Input
            id="bundleQty"
            type="number"
            min={2}
            placeholder="e.g. 3"
            value={item.cartonSize || ""}
            onChange={(e) =>
              onItemChange({
                ...item,
                cartonSize: Number(e.target.value) || undefined,
              })
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cartonPrice">{t("Bundle Price (NGN)")}</Label>
          <Input
            id="cartonPrice"
            type="number"
            min={0}
            placeholder="e.g. 10000"
            value={item.cartonPrice || ""}
            onChange={(e) =>
              onItemChange({
                ...item,
                cartonPrice: Number(e.target.value) || undefined,
              })
            }
          />
        </div>
      </div>
      {item.cartonSize && item.cartonPrice && bundleDiscount > 0 && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-3">
          <p className="text-sm text-success font-medium">
            {t("Bundle saves {discount}% ({amount} off)", {
              values: {
                discount: bundleDiscount.toFixed(1),
                amount: Math.round(
                  item.cartonSize * item.sellingPrice - item.cartonPrice,
                ).toLocaleString(),
              },
            })}
          </p>
        </div>
      )}
    </div>
  );
}


