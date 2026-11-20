"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { SalesListEnvelope } from "@/lib/api/types";
import {
  BackendSale,
  toSaleRecord,
} from "@/lib/adapters/sale.adapter";
import { toSalePayload, toHeldPayload } from "@/lib/api/payloads";
import type { RefundLine } from "@/lib/refund";
import { toastMutationError } from "@/lib/toastError";
import type { HeldTransaction, SaleRecord } from "@/types/salesTypes";

interface SalesDataContextType {
  recentSales: SaleRecord[];
  addSaleRecord: (sale: SaleRecord) => Promise<void>;
  refundSale: (
    saleId: string,
    reason: string,
    items?: RefundLine[],
  ) => Promise<void>;
  getSaleById: (id: string) => Promise<SaleRecord | null>;
  heldTransactions: HeldTransaction[];
  createHeld: (held: HeldTransaction) => Promise<void>;
  deleteHeld: (id: string) => Promise<void>;
  isRecordingSale: boolean;
  totalSalesAmount: number;
  totalItemsSold: number;
  isLoading: boolean;
  isError: boolean;
}

const SalesDataContext = createContext<SalesDataContextType | undefined>(
  undefined,
);

export function SalesDataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["held"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
  }, [queryClient]);

  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: () =>
      api.get<SalesListEnvelope<BackendSale>>("/sales?limit=100"),
  });

  const heldQuery = useQuery({
    queryKey: ["held"],
    queryFn: () => api.get<HeldTransaction[]>("/sales/held"),
  });

  const recentSales = useMemo(
    () => (salesQuery.data?.data ?? []).map(toSaleRecord),
    [salesQuery.data],
  );

  const heldTransactions = useMemo(
    () => heldQuery.data ?? [],
    [heldQuery.data],
  );

  const addMutation = useMutation({
    mutationFn: (sale: SaleRecord) =>
      api.post<BackendSale>("/sales", toSalePayload(sale), {
        headers: { "Idempotency-Key": sale.id },
      }),
    onSuccess: invalidate,
    onError: toastMutationError,
  });

  const refundMutation = useMutation({
    mutationFn: ({
      saleId,
      reason,
      items,
    }: {
      saleId: string;
      reason: string;
      items?: RefundLine[];
    }) =>
      api.patch<BackendSale>(`/sales/${saleId}/refund`, {
        refundReason: reason,
        ...(items && items.length > 0 ? { items } : {}),
      }),
    onSuccess: invalidate,
    onError: toastMutationError,
  });

  const createHeldMutation = useMutation({
    mutationFn: (held: HeldTransaction) =>
      api.post<HeldTransaction>("/sales/held", toHeldPayload(held)),
    onSuccess: invalidate,
    onError: toastMutationError,
  });

  const deleteHeldMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/sales/held/${id}`),
    onSuccess: invalidate,
    onError: toastMutationError,
  });

  const addSaleRecord = useCallback(
    async (sale: SaleRecord): Promise<void> => {
      await addMutation.mutateAsync(sale);
    },
    [addMutation],
  );

  const refundSale = useCallback(
    async (
      saleId: string,
      reason: string,
      items?: RefundLine[],
    ): Promise<void> => {
      await refundMutation.mutateAsync({ saleId, reason, items });
    },
    [refundMutation],
  );

  const getSaleById = useCallback(
    async (id: string): Promise<SaleRecord | null> => {
      try {
        const backendSale = await api.get<BackendSale>(`/sales/${id}`);
        return toSaleRecord(backendSale);
      } catch {
        return null;
      }
    },
    [],
  );

  const createHeld = useCallback(
    async (held: HeldTransaction): Promise<void> => {
      await createHeldMutation.mutateAsync(held);
    },
    [createHeldMutation],
  );

  const deleteHeld = useCallback(
    async (id: string): Promise<void> => {
      await deleteHeldMutation.mutateAsync(id);
    },
    [deleteHeldMutation],
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
            sum +
            (sale.items.length > 0
              ? sale.items.reduce(
                  (itemSum, item) => itemSum + item.quantity,
                  0,
                )
              : (sale.itemCount ?? 0)),
          0,
        ),
    [recentSales],
  );

  const value = useMemo(
    () => ({
      recentSales,
      addSaleRecord,
      refundSale,
      getSaleById,
      heldTransactions,
      createHeld,
      deleteHeld,
      isRecordingSale: addMutation.isPending,
      totalSalesAmount,
      totalItemsSold,
      isLoading: salesQuery.isLoading,
      isError: salesQuery.isError,
    }),
    [
      recentSales,
      addSaleRecord,
      refundSale,
      getSaleById,
      heldTransactions,
      createHeld,
      deleteHeld,
      addMutation.isPending,
      totalSalesAmount,
      totalItemsSold,
      salesQuery.isLoading,
      salesQuery.isError,
    ],
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
