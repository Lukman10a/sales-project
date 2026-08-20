"use client";

import { Package, Clock, CheckCircle, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { SaleRecord } from "@/types/salesTypes";

interface RecentSalesListProps {
  sales: SaleRecord[];
  onViewReceipt?: (sale: SaleRecord) => void;
}

export default function RecentSalesList({
  sales,
  onViewReceipt,
}: RecentSalesListProps) {
  const { t, formatCurrency } = useLanguage();

  return (
    <div className="bg-card rounded-xl border shadow-sm p-6">
      <h3 className="font-display font-semibold text-lg text-foreground mb-4">
        {t("Recent Sales")}
      </h3>
      <div className="space-y-3">
        {sales.slice(0, 5).map((sale) => (
          <div
            key={sale.id}
            className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {sale.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{sale.time}</span>
                  <span>•</span>
                  <span>
                    {t("by {name}", {
                      values: { name: sale.soldByName ?? sale.soldBy },
                    })}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">
                {formatCurrency(sale.total)}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  sale.status === "completed"
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-warning/10 text-warning border-warning/20",
                )}
              >
                {sale.status === "completed" ? (
                  <CheckCircle className="w-3 h-3 mr-1" />
                ) : (
                  <Clock className="w-3 h-3 mr-1" />
                )}
                {t(sale.status)}
              </Badge>
            </div>
            {onViewReceipt && (
              <Button
                onClick={() => onViewReceipt(sale)}
                variant="ghost"
                size="sm"
                className="ml-2"
                aria-label={t("View receipt for {name}", {
                  values: { name: sale.id },
                })}
              >
                <Receipt className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}



