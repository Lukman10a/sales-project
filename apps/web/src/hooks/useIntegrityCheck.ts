"use client";

import { useCallback, useMemo, useState } from "react";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { useSalesData } from "@/contexts/SalesDataContext";

export interface IntegrityCheckItem {
  id: string;
  name: string;
  status: "passed" | "warning" | "failed";
  description: string;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface UseIntegrityCheckResult {
  checks: IntegrityCheckItem[];
  isLoading: boolean;
  runCheck: () => void;
}

export function useIntegrityCheck(): UseIntegrityCheckResult {
  const { inventory, lowStockItems, outOfStockItems, isLoading: invLoading } = useInventoryData();
  const { recentSales, isLoading: salesLoading } = useSalesData();
  const [tick, setTick] = useState(0);

  const runCheck = useCallback(() => setTick((t) => t + 1), []);

  const checks = useMemo<IntegrityCheckItem[]>(() => {
    // tick is intentional to trigger recompute on runCheck
    void tick;

    const result: IntegrityCheckItem[] = [];

    // 1. No negative quantities
    const hasNegative = inventory.some((i) => i.quantity < 0);
    result.push({
      id: "negative-quantities",
      name: "No negative quantities",
      status: hasNegative ? "failed" : "passed",
      description: hasNegative
        ? `Found ${inventory.filter((i) => i.quantity < 0).length} item(s) with negative quantity`
        : "All quantities are non-negative",
      severity: hasNegative ? "high" : undefined,
    });

    // 2. Low-stock counts match
    const actualLow = inventory.filter((i) => i.status === "low-stock").length;
    const lowMismatch = actualLow !== lowStockItems;
    result.push({
      id: "low-stock-count",
      name: "Low-stock counts match",
      status: lowMismatch ? "warning" : "passed",
      description: lowMismatch
        ? `Low-stock count mismatch: expected ${actualLow} but context reports ${lowStockItems}`
        : `Low-stock count consistent: ${actualLow}`,
      severity: lowMismatch ? "medium" : undefined,
    });

    // 3. Out-of-stock counts match
    const actualOut = inventory.filter((i) => i.status === "out-of-stock").length;
    const outMismatch = actualOut !== outOfStockItems;
    result.push({
      id: "out-of-stock-count",
      name: "Out-of-stock counts match",
      status: outMismatch ? "warning" : "passed",
      description: outMismatch
        ? `Out-of-stock count mismatch: expected ${actualOut} but context reports ${outOfStockItems}`
        : `Out-of-stock count consistent: ${actualOut}`,
      severity: outMismatch ? "medium" : undefined,
    });

    // 4. Sales totals consistent
    let salesIssue: string | null = null;
    let salesStatus: "passed" | "warning" | "failed" = "passed";
    if (recentSales.length > 0) {
      for (const sale of recentSales) {
        if (sale.total < 0) {
          salesIssue = `Sale ${sale.id} has negative total ${sale.total}`;
          salesStatus = "failed";
          break;
        }
        if (sale.items && sale.items.length > 0) {
          const sum = sale.items.reduce((s, it) => s + it.price * it.quantity, 0);
          // allow discount: total may be less than sum but not negative and not wildly above sum
          if (Math.abs(sale.total - sum) > 0.01 && sale.total > sum + 0.01) {
            salesIssue = `Sale ${sale.id} total ${sale.total} inconsistent with items sum ${sum}`;
            salesStatus = "warning";
            break;
          }
        }
      }
    }
    result.push({
      id: "sales-totals",
      name: "Sales totals consistent",
      status: salesStatus,
      description: salesIssue ?? (recentSales.length === 0 ? "No sales to check" : "All sales totals are consistent"),
      severity: salesStatus === "failed" ? "high" : salesStatus === "warning" ? "medium" : undefined,
    });

    return result;
  }, [inventory, lowStockItems, outOfStockItems, recentSales, tick]);

  return {
    checks,
    isLoading: invLoading || salesLoading,
    runCheck,
  };
}
