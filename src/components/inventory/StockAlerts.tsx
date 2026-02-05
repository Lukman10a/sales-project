"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Package,
  TrendingDown,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

export default function StockAlerts() {
  const { inventory } = useInventoryData();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const alerts = useMemo(() => {
    const criticalAlerts: any[] = [];
    const warningAlerts: any[] = [];

    inventory.forEach((item) => {
      if (dismissed.includes(item.id)) return;

      // Out of stock
      if (item.status === "out-of-stock") {
        criticalAlerts.push({
          id: item.id,
          type: "critical",
          title: t("Out of Stock"),
          message: t(
            "{item} is out of stock. Restock immediately to avoid lost sales.",
            {
              values: { item: item.name },
            },
          ),
          item,
        });
      }
      // Low stock
      else if (
        item.status === "low-stock" ||
        (item.reorderPoint && item.quantity <= item.reorderPoint)
      ) {
        warningAlerts.push({
          id: item.id,
          type: "warning",
          title: t("Low Stock"),
          message: t("{item} is running low. Current stock: {qty} units.", {
            values: { item: item.name, qty: item.quantity },
          }),
          item,
        });
      }
    });

    return [...criticalAlerts, ...warningAlerts];
  }, [inventory, dismissed, t]);

  const handleDismiss = (alertId: string) => {
    setDismissed((prev) => [...prev, alertId]);
  };

  if (alerts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <h3 className="font-semibold text-foreground">{t("Stock Alerts")}</h3>
          <Badge variant="secondary">{alerts.length}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Alert
                  className={cn(
                    alert.type === "critical"
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-warning/50 bg-warning/5",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        alert.type === "critical"
                          ? "bg-destructive/10"
                          : "bg-warning/10",
                      )}
                    >
                      {alert.type === "critical" ? (
                        <Package className="w-4 h-4 text-destructive" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-warning" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <AlertTitle className="text-sm font-semibold mb-1">
                        {alert.title}
                      </AlertTitle>
                      <AlertDescription className="text-sm mb-3">
                        {alert.message}
                      </AlertDescription>
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/inventory/${alert.item.id}`}>
                            {t("View Item")}
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline">
                          {t("Restock")}
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => handleDismiss(alert.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Alert>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
