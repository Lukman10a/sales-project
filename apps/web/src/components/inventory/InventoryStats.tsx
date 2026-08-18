import { useLanguage } from "@/contexts/LanguageContext";

interface InventoryStatsProps {
  totalItems: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export default function InventoryStats({
  totalItems,
  inStock,
  lowStock,
  outOfStock,
}: InventoryStatsProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-card rounded-xl border p-3 sm:p-4 shadow-sm">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          {t("Total Items")}
        </p>
        <p className="text-xl sm:text-2xl font-display font-bold text-foreground tracking-tight mt-1">
          {totalItems}
        </p>
      </div>
      <div className="bg-card rounded-xl border p-3 sm:p-4 shadow-sm">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          {t("In Stock")}
        </p>
        <p className="text-xl sm:text-2xl font-display font-bold text-success tracking-tight mt-1">
          {inStock}
        </p>
      </div>
      <div className="bg-card rounded-xl border p-3 sm:p-4 shadow-sm">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          {t("Low Stock")}
        </p>
        <p className="text-xl sm:text-2xl font-display font-bold text-warning tracking-tight mt-1">
          {lowStock}
        </p>
      </div>
      <div className="bg-card rounded-xl border p-3 sm:p-4 shadow-sm">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          {t("Out of Stock")}
        </p>
        <p className="text-xl sm:text-2xl font-display font-bold text-destructive tracking-tight mt-1">
          {outOfStock}
        </p>
      </div>
    </div>
  );
}



