"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import {
  BackendInventoryItem,
  toInventoryItem,
} from "@/lib/adapters/inventory.adapter";
import { toInventoryPayload } from "@/lib/api/payloads";
import type { InventoryItem } from "@/types/inventoryTypes";

interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

interface InventoryDataContextType {
  inventory: InventoryItem[];
  isLoading: boolean;
  isError: boolean;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  decrementInventory: (id: string, quantity: number) => void;
  confirmInventoryReceipt: (id: string) => void;
  bulkImportInventory: (file: File) => Promise<BulkImportResult>;
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
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
  }, [queryClient]);

  const inventoryQuery = useQuery({
    queryKey: ["inventory"],
    queryFn: () =>
      api.get<ApiEnvelope<BackendInventoryItem[]>>("/inventory?limit=100"),
  });

  const inventory = useMemo(
    () => (inventoryQuery.data?.data ?? []).map(toInventoryItem),
    [inventoryQuery.data],
  );

  const addMutation = useMutation({
    mutationFn: (item: InventoryItem) =>
      api.post<BackendInventoryItem>("/inventory", toInventoryPayload(item)),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<InventoryItem>;
    }) =>
      api.patch<BackendInventoryItem>(
        `/inventory/${id}`,
        toInventoryPayload(updates),
      ),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/inventory/${id}`),
    onSuccess: invalidate,
  });

  const decrementMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.post<BackendInventoryItem>(`/inventory/${id}/decrement`, {
        quantity,
      }),
    onSuccess: invalidate,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch<BackendInventoryItem>(`/inventory/${id}`, {
        confirmedByApprentice: true,
      }),
    onSuccess: invalidate,
  });

  const bulkImportMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.postForm<BulkImportResult>("/inventory/bulk-import", formData);
    },
    onSuccess: invalidate,
  });

  const addInventoryItem = useCallback(
    (item: InventoryItem) => addMutation.mutate(item),
    [addMutation],
  );

  const updateInventoryItem = useCallback(
    (id: string, updates: Partial<InventoryItem>) =>
      updateMutation.mutate({ id, updates }),
    [updateMutation],
  );

  const deleteInventoryItem = useCallback(
    (id: string) => deleteMutation.mutate(id),
    [deleteMutation],
  );

  const decrementInventory = useCallback(
    (id: string, quantity: number) => decrementMutation.mutate({ id, quantity }),
    [decrementMutation],
  );

  const confirmInventoryReceipt = useCallback(
    (id: string) => confirmMutation.mutate(id),
    [confirmMutation],
  );

  const bulkImportInventory = useCallback(
    (file: File) => bulkImportMutation.mutateAsync(file),
    [bulkImportMutation],
  );

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
      isLoading: inventoryQuery.isLoading,
      isError: inventoryQuery.isError,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      decrementInventory,
      confirmInventoryReceipt,
      bulkImportInventory,
      totalItemsInStock,
      lowStockItems,
      outOfStockItems,
    }),
    [
      inventory,
      inventoryQuery.isLoading,
      inventoryQuery.isError,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      decrementInventory,
      confirmInventoryReceipt,
      bulkImportInventory,
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