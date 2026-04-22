"use client";

import { motion } from "framer-motion";
import { Clock, Package, ArrowRight } from "lucide-react";
import { useSalesData } from "@/contexts/SalesDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

const RecentSales = () => {
  const { recentSales } = useSalesData();
  const displaySales = recentSales.slice(0, 5);
  const { t, formatCurrency } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-card rounded-xl border p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground tracking-tight">
            {t("Recent Sales")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("Last {count} transactions", {
              values: { count: displaySales.length },
            })}
          </p>
        </div>
        <Link
          href="/sales"
          className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
        >
          {t("View All")}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {displaySales.map((sale, index) => (
          <motion.div
            key={sale.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {sale.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t("by {name}", { values: { name: sale.soldBy } })}</span>
                <span>•</span>
                <span>{sale.time}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">
                {formatCurrency(sale.total)}
              </p>
              <p className="text-xs text-success font-medium">
                {t(sale.status)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default RecentSales;


