"use client";

import { History } from "lucide-react";
import { useStockMovements } from "@/contexts/InventoryDataContext";
import type { StockMovement } from "@/contexts/InventoryDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const REASON_LABELS: Record<StockMovement["reason"], string> = {
  sale: "Sale",
  refund: "Refund",
  restock: "Restock",
  adjustment: "Adjustment",
  import: "Import",
  void: "Void",
};

/** A product's stock movements, newest first: the ledger behind its quantity. */
export default function StockHistoryCard({ productId }: { productId: string }) {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useStockMovements(productId);
  const moves = data ?? [];

  return (
    <div className="bg-card rounded-xl border shadow-sm p-6">
      <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
        <History className="w-4 h-4" />
        {t("Stock history")}
      </h3>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("Loading...")}</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {t("Could not load the stock history")}
        </p>
      ) : moves.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("No stock changes yet")}
        </p>
      ) : (
        <ul className="divide-y">
          {moves.map((m) => (
            <li
              key={m.id}
              className="py-3 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t(REASON_LABELS[m.reason])}
                  {m.note && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {m.note}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString()}
                  {m.actorName && ` · ${m.actorName}`}
                </p>
              </div>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  m.delta > 0 ? "text-success" : "text-destructive",
                )}
              >
                {m.delta > 0 ? `+${m.delta}` : m.delta}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
