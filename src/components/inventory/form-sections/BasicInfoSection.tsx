import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";

interface BasicInfoSectionProps {
  item: Omit<InventoryItem, "id">;
  onItemChange: (item: Omit<InventoryItem, "id">) => void;
  barcodeBuffer: string;
  validation?: {
    nameError?: string;
    barcodeError?: string;
  };
}

export default function BasicInfoSection({
  item,
  onItemChange,
  barcodeBuffer,
  validation,
}: BasicInfoSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t("Basic Information")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">{t("Item Name")}</Label>
          <Input
            id="name"
            placeholder={t("e.g. Bluetooth Speaker")}
            value={item.name}
            onChange={(e) => onItemChange({ ...item, name: e.target.value })}
          />
          {validation?.nameError && (
            <p className="text-xs text-destructive">{validation.nameError}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="barcode">
            {t("Barcode")}{" "}
            <span className="text-muted-foreground text-xs">
              ({t("optional")})
            </span>
          </Label>
          <div className="relative">
            <Input
              id="barcode"
              placeholder={t("Scan or enter barcode")}
              value={item.barcode || ""}
              onChange={(e) =>
                onItemChange({ ...item, barcode: e.target.value })
              }
            />
            {barcodeBuffer && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {t("Scanning...")}
              </span>
            )}
          </div>
          {validation?.barcodeError && (
            <p className="text-xs text-destructive">
              {validation.barcodeError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
