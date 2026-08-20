"use client";

import { Package, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { HeldTransaction } from "@/types/salesTypes";

interface HeldSalesListProps {
  transactions: HeldTransaction[];
  onResume: (held: HeldTransaction) => void;
  onDelete: (id: string) => void;
}

export default function HeldSalesList({
  transactions,
  onResume,
  onDelete,
}: HeldSalesListProps) {
  const { t, formatCurrency } = useLanguage();

  if (transactions.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border shadow-sm p-6">
      <h3 className="font-display font-semibold text-lg text-foreground mb-4">
        {t("Held Sales")}
      </h3>
      <div className="space-y-3">
        {transactions.map((held) => {
          const itemCount = held.items.reduce(
            (sum, item) => sum + item.quantity,
            0,
          );
          const subtotal = held.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
          );
          const total = subtotal - subtotal * (held.discountPercent / 100);

          return (
            <div
              key={held.id}
              className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {held.customerName}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {itemCount} {itemCount === 1 ? t("item") : t("items")}
                    </span>
                    <span>•</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResume(held)}
                >
                  <Play className="w-3 h-3 mr-1" />
                  {t("Resume")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t("Delete held sale")}
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(held.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}