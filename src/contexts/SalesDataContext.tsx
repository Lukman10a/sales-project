"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { recentSalesData } from "@/data/sales";
import type { SaleRecord } from "@/types/salesTypes";

interface SalesDataContextType {
  recentSales: SaleRecord[];
  setRecentSales: (sales: SaleRecord[]) => void;
  addSaleRecord: (sale: SaleRecord) => void;
  totalSalesAmount: number;
  totalItemsSold: number;
}

const SalesDataContext = createContext<SalesDataContextType | undefined>(
  undefined,
);

export function SalesDataProvider({ children }: { children: React.ReactNode }) {
  const [recentSales, setRecentSales] = useState<SaleRecord[]>(recentSalesData);
  const [isHydrated, setIsHydrated] = useState(false);
  const salesSaveRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const storedSales = localStorage.getItem("luxa_sales");
    if (storedSales) setRecentSales(JSON.parse(storedSales));
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!isHydrated) return;

    if (salesSaveRef.current) {
      clearTimeout(salesSaveRef.current);
    }
    salesSaveRef.current = setTimeout(() => {
      localStorage.setItem("luxa_sales", JSON.stringify(recentSales));
    }, 250);

    return () => {
      if (salesSaveRef.current) {
        clearTimeout(salesSaveRef.current);
      }
    };
  }, [recentSales, isHydrated]);

  const addSaleRecord = useCallback((sale: SaleRecord) => {
    setRecentSales((prev) => [sale, ...prev]);
  }, []);

  const totalSalesAmount = useMemo(
    () =>
      recentSales
        .filter((s) => s.status === "completed")
        .reduce((sum, sale) => sum + sale.total, 0),
    [recentSales],
  );

  const totalItemsSold = useMemo(
    () =>
      recentSales
        .filter((s) => s.status === "completed")
        .reduce(
          (sum, sale) =>
            sum +
            sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
          0,
        ),
    [recentSales],
  );

  const value = useMemo(
    () => ({
      recentSales,
      setRecentSales,
      addSaleRecord,
      totalSalesAmount,
      totalItemsSold,
    }),
    [recentSales, addSaleRecord, totalSalesAmount, totalItemsSold],
  );

  return (
    <SalesDataContext.Provider value={value}>
      {children}
    </SalesDataContext.Provider>
  );
}

export function useSalesData() {
  const context = useContext(SalesDataContext);
  if (context === undefined) {
    throw new Error("useSalesData must be used within a SalesDataProvider");
  }
  return context;
}


