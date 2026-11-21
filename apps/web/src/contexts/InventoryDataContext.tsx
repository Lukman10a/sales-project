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
import { toastMutationError } from "@/lib/toastError";
import type { InventoryItem } from "@/types/inventoryTypes";

/** One row of an import, as the preview reports it (and the confirm applies it). */
export interface ImportPlanRow {
  row: number;
  name: string;
  action: "create" | "update";
  productId?: string;
  quantity: number;
  stockChange: number;
  errors: string[];
}

export interface ImportResult {
  summary: {
    rows: number;
    valid: number;
    invalid: number;
    creates: number;
    updates: number;
  };
  rows: ImportPlanRow[];
}

export interface StockMovement {
  id: string;
  delta: number;
  reason: "sale" | "refund" | "restock" | "adjustment" | "import" | "void";
  refId: string | null;
  note: string | null;
  actorName?: string;
  createdAt: string;
}

interface InventoryDataContextType {
  inventory: InventoryItem[];
  isLoading: boolean;
  isError: boolean;
  addInventoryItem: (item: InventoryItem) => Promise<void>;
  updateInventoryItem: (
    id: string,
    updates: Partial<InventoryItem>,
  ) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  /** Stock received. */
  restockItem: (id: string, quantity: number, note?: string) => Promise<void>;
  /** A correction (plus or minus); the reason is required. */
  adjustStock: (id: string, delta: number, reason: string) => Promise<void>;
  /** Dry run of an import file: per-row verdicts, nothing saved. */
  previewImport: (file: File) => Promise<ImportResult>;
  /** Saves the file's valid rows. */
  confirmImport: (file: File) => Promise<ImportResult>;
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
    onError: toastMutationError,
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
        toInventoryPayload(updates, { includeStock: false }),
      ),
    onSuccess: invalidate,
    onError: toastMutationError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/inventory/${id}`),
    onSuccess: invalidate,
    onError: toastMutationError,
  });

  const restockMutation = useMutation({
    mutationFn: ({
      id,
      quantity,
      note,
    }: {
      id: string;
      quantity: number;
      note?: string;
    }) =>
      api.post<BackendInventoryItem>(`/inventory/${id}/restock`, {
        quantity,
        ...(note ? { note } : {}),
      }),
    onSuccess: (_data, { id }) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["stock-movements", id] });
    },
    onError: toastMutationError,
  });

  const adjustMutation = useMutation({
    mutationFn: ({
      id,
      delta,
      reason,
    }: {
      id: string;
      delta: number;
      reason: string;
    }) =>
      api.post<BackendInventoryItem>(`/inventory/${id}/adjust`, {
        delta,
        reason,
      }),
    onSuccess: (_data, { id }) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["stock-movements", id] });
    },
    onError: toastMutationError,
  });

  const importForm = (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return formData;
  };

  const previewMutation = useMutation({
    mutationFn: (file: File) =>
      api.postForm<ImportResult>("/inventory/import/preview", importForm(file)),
    onError: toastMutationError,
  });

  const confirmImportMutation = useMutation({
    mutationFn: (file: File) =>
      api.postForm<ImportResult>("/inventory/import/confirm", importForm(file)),
    onSuccess: invalidate,
    onError: toastMutationError,
  });

  const addInventoryItem = useCallback(
    async (item: InventoryItem): Promise<void> => {
      await addMutation.mutateAsync(item);
    },
    [addMutation],
  );

  const updateInventoryItem = useCallback(
    async (id: string, updates: Partial<InventoryItem>): Promise<void> => {
      await updateMutation.mutateAsync({ id, updates });
    },
    [updateMutation],
  );

  const deleteInventoryItem = useCallback(
    async (id: string): Promise<void> => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );

  const restockItem = useCallback(
    async (id: string, quantity: number, note?: string): Promise<void> => {
      await restockMutation.mutateAsync({ id, quantity, note });
    },
    [restockMutation],
  );

  const adjustStock = useCallback(
    async (id: string, delta: number, reason: string): Promise<void> => {
      await adjustMutation.mutateAsync({ id, delta, reason });
    },
    [adjustMutation],
  );

  const previewImport = useCallback(
    (file: File) => previewMutation.mutateAsync(file),
    [previewMutation],
  );

  const confirmImport = useCallback(
    (file: File) => confirmImportMutation.mutateAsync(file),
    [confirmImportMutation],
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
      restockItem,
      adjustStock,
      previewImport,
      confirmImport,
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
      restockItem,
      adjustStock,
      previewImport,
      confirmImport,
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

/** A product's stock history, newest first. */
export function useStockMovements(id: string | undefined) {
  return useQuery({
    queryKey: ["stock-movements", id],
    queryFn: () =>
      api.get<StockMovement[]>(`/inventory/${id}/movements?limit=50`),
    enabled: Boolean(id),
  });
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