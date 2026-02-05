"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { inventoryItems } from "@/data/inventory";
import type { InventoryItem } from "@/types/inventoryTypes";

interface InventoryDataContextType {
  inventory: InventoryItem[];
  setInventory: (items: InventoryItem[]) => void;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  decrementInventory: (id: string, quantity: number) => void;
  confirmInventoryReceipt: (id: string) => void;
  totalItemsInStock: number;
  lowStockItems: number;
  outOfStockItems: number;
}

const InventoryDataContext = createContext<
  InventoryDataContextType | undefined
>(undefined);

export function InventoryDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [inventory, setInventory] = useState<InventoryItem[]>(inventoryItems);
  const [isHydrated, setIsHydrated] = useState(false);
  const inventorySaveRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const storedInventory = localStorage.getItem("luxa_inventory");
    if (storedInventory) {
      const parsed = JSON.parse(storedInventory) as InventoryItem[];
      const normalized = parsed.map((item) => ({
        ...item,
        category: Array.isArray(item.category)
          ? item.category
          : [item.category].filter(Boolean),
      }));
      setInventory(normalized);
    }
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!isHydrated) return;

    if (inventorySaveRef.current) {
      clearTimeout(inventorySaveRef.current);
    }
    inventorySaveRef.current = setTimeout(() => {
      localStorage.setItem("luxa_inventory", JSON.stringify(inventory));
    }, 250);

    return () => {
      if (inventorySaveRef.current) {
        clearTimeout(inventorySaveRef.current);
      }
    };
  }, [inventory, isHydrated]);

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

  const value = useMemo(
    () => ({
      inventory,
      setInventory,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      decrementInventory,
      confirmInventoryReceipt,
      totalItemsInStock,
      lowStockItems,
      outOfStockItems,
    }),
    [
      inventory,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      decrementInventory,
      confirmInventoryReceipt,
      totalItemsInStock,
      lowStockItems,
      outOfStockItems,
    ],
  );

  return (
    <InventoryDataContext.Provider value={value}>
      {children}
    </InventoryDataContext.Provider>
  );
}

export function useInventoryData() {
  const context = useContext(InventoryDataContext);
  if (context === undefined) {
    throw new Error(
      "useInventoryData must be used within an InventoryDataProvider",
    );
  }
  return context;
}
