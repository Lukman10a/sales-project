"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Package, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

const statusConfig = {
  critical: {
    label: "Critical",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  "low-stock": {
    label: "Low Stock",
    className: "bg-warning/10 text-warning border-warning/20",
  },
};

const InventoryAlert = () => {
  const { inventory } = useInventoryData();
  const { t } = useLanguage();

  // Get low and out of stock items
  const alertItems = inventory.filter(
    (item) => item.status === "low-stock" || item.status === "out-of-stock",
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="bg-card rounded-2xl border card-elevated p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">
              {t("Inventory Alerts")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("{count} items need attention", {
                values: { count: alertItems.length },
              })}
            </p>
          </div>
        </div>
        <Link
          href="/inventory"
          className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
        >
          {t("View All")}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {alertItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("All items are in good stock")}
          </p>
        ) : (
          alertItems.slice(0, 4).map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border",
                item.status === "out-of-stock"
                  ? "bg-destructive/5 border-destructive/20"
                  : "bg-muted/30 border-border",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("{quantity} remaining", {
                      values: { quantity: item.quantity },
                    })}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "font-medium",
                  item.status === "out-of-stock"
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : statusConfig["low-stock"].className,
                )}
              >
                {item.status === "out-of-stock"
                  ? t("Out of Stock")
                  : t("Low Stock")}
              </Badge>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default InventoryAlert;
