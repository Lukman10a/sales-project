"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { inventoryItems } from "@/data/inventory";
import { recentSalesData } from "@/data/sales";
import { mockInvestors, mockWithdrawalRecords } from "@/data/investor";
import type { InventoryItem } from "@/types/inventoryTypes";
import type { SaleRecord } from "@/types/salesTypes";
import type { Investor, WithdrawalRecord } from "@/types/investorTypes";

interface DataContextType {
  inventory: InventoryItem[];
  setInventory: (items: InventoryItem[]) => void;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  decrementInventory: (id: string, quantity: number) => void;
  confirmInventoryReceipt: (id: string) => void;

  recentSales: SaleRecord[];
  setRecentSales: (sales: SaleRecord[]) => void;
  addSaleRecord: (sale: SaleRecord) => void;

  investors: Investor[];
  updateInvestor: (id: string, updates: Partial<Investor>) => void;

  withdrawals: WithdrawalRecord[];
  updateWithdrawal: (id: string, updates: Partial<WithdrawalRecord>) => void;

  // Computed stats
  totalItemsInStock: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalSalesAmount: number;
  totalItemsSold: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>(inventoryItems);
  const [recentSales, setRecentSales] = useState<SaleRecord[]>(recentSalesData);
  const [investors, setInvestors] = useState<Investor[]>(mockInvestors);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(
    mockWithdrawalRecords,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const inventorySaveRef = useRef<NodeJS.Timeout | null>(null);
  const salesSaveRef = useRef<NodeJS.Timeout | null>(null);
  const investorsSaveRef = useRef<NodeJS.Timeout | null>(null);
  const withdrawalsSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount (client-only)
  React.useEffect(() => {
    const storedInventory = localStorage.getItem("luxa_inventory");
    const storedSales = localStorage.getItem("luxa_sales");
    const storedInvestors = localStorage.getItem("luxa_investors");
    const storedWithdrawals = localStorage.getItem("luxa_withdrawals");

    if (storedInventory) setInventory(JSON.parse(storedInventory));
    if (storedSales) setRecentSales(JSON.parse(storedSales));
    if (storedInvestors) setInvestors(JSON.parse(storedInvestors));
    if (storedWithdrawals) setWithdrawals(JSON.parse(storedWithdrawals));

    setIsHydrated(true);
  }, []);

  // Persist to localStorage (only after hydration)
  React.useEffect(() => {
    if (isHydrated) {
      if (inventorySaveRef.current) {
        clearTimeout(inventorySaveRef.current);
      }
      inventorySaveRef.current = setTimeout(() => {
        localStorage.setItem("luxa_inventory", JSON.stringify(inventory));
      }, 250);
    }
    return () => {
      if (inventorySaveRef.current) {
        clearTimeout(inventorySaveRef.current);
      }
    };
  }, [inventory, isHydrated]);

  React.useEffect(() => {
    if (isHydrated) {
      if (salesSaveRef.current) {
        clearTimeout(salesSaveRef.current);
      }
      salesSaveRef.current = setTimeout(() => {
        localStorage.setItem("luxa_sales", JSON.stringify(recentSales));
      }, 250);
    }
    return () => {
      if (salesSaveRef.current) {
        clearTimeout(salesSaveRef.current);
      }
    };
  }, [recentSales, isHydrated]);

  React.useEffect(() => {
    if (isHydrated) {
      if (investorsSaveRef.current) {
        clearTimeout(investorsSaveRef.current);
      }
      investorsSaveRef.current = setTimeout(() => {
        localStorage.setItem("luxa_investors", JSON.stringify(investors));
      }, 250);
    }
    return () => {
      if (investorsSaveRef.current) {
        clearTimeout(investorsSaveRef.current);
      }
    };
  }, [investors, isHydrated]);

  React.useEffect(() => {
    if (isHydrated) {
      if (withdrawalsSaveRef.current) {
        clearTimeout(withdrawalsSaveRef.current);
      }
      withdrawalsSaveRef.current = setTimeout(() => {
        localStorage.setItem("luxa_withdrawals", JSON.stringify(withdrawals));
      }, 250);
    }
    return () => {
      if (withdrawalsSaveRef.current) {
        clearTimeout(withdrawalsSaveRef.current);
      }
    };
  }, [withdrawals, isHydrated]);

  const addInventoryItem = useCallback((item: InventoryItem) => {
    setInventory((prev) => [item, ...prev]);
  }, []);

  const updateInventoryItem = useCallback(
    (id: string, updates: Partial<InventoryItem>) => {
      setInventory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      );
    },
    [],
  );

  const deleteInventoryItem = useCallback((id: string) => {
    setInventory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const decrementInventory = useCallback((id: string, quantity: number) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity - quantity) }
          : item,
      ),
    );
  }, []);

  const confirmInventoryReceipt = useCallback((id: string) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, confirmedByApprentice: true } : item,
      ),
    );
  }, []);

  const addSaleRecord = useCallback((sale: SaleRecord) => {
    setRecentSales((prev) => [sale, ...prev]);
  }, []);

  const updateInvestor = useCallback(
    (id: string, updates: Partial<Investor>) => {
      setInvestors((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
      );
    },
    [],
  );

  const updateWithdrawal = useCallback(
    (id: string, updates: Partial<WithdrawalRecord>) => {
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updates } : w)),
      );
    },
    [],
  );

  // Computed stats - memoized to prevent recalculation on every render
  const totalItemsInStock = useMemo(
    () => inventory.filter((i) => i.status === "in-stock").length,
    [inventory],
  );

  const lowStockItems = useMemo(
    () => inventory.filter((i) => i.status === "low-stock").length,
    [inventory],
  );

  const outOfStockItems = useMemo(
    () => inventory.filter((i) => i.status === "out-of-stock").length,
    [inventory],
  );

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
            sum + sale.items.reduce((sum, i) => sum + i.quantity, 0),
          0,
        ),
    [recentSales],
  );

  const value: DataContextType = useMemo(
    () => ({
      inventory,
      setInventory,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      decrementInventory,
      confirmInventoryReceipt,
      recentSales,
      setRecentSales,
      addSaleRecord,
      investors,
      updateInvestor,
      withdrawals,
      updateWithdrawal,
      totalItemsInStock,
      lowStockItems,
      outOfStockItems,
      totalSalesAmount,
      totalItemsSold,
    }),
    [
      inventory,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      decrementInventory,
      confirmInventoryReceipt,
      recentSales,
      addSaleRecord,
      investors,
      updateInvestor,
      withdrawals,
      updateWithdrawal,
      totalItemsInStock,
      lowStockItems,
      outOfStockItems,
      totalSalesAmount,
      totalItemsSold,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}


