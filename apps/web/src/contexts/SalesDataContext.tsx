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
import type { HeldTransaction, SaleRecord } from "@/types/salesTypes";

interface SalesDataContextType {
  recentSales: SaleRecord[];
  setRecentSales: (sales: SaleRecord[]) => void;
  addSaleRecord: (sale: SaleRecord) => void;
  refundSale: (
    saleId: string,
    refundAmount: number,
    reason: string,
  ) => void;
  getSaleById: (id: string) => Promise<SaleRecord | null>;
  heldTransactions: HeldTransaction[];
  createHeld: (held: HeldTransaction) => void;
  deleteHeld: (id: string) => void;
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

  const setRecentSales = useCallback((sales: SaleRecord[]) => {
    queryClient.setQueryData(["sales"], sales);
  }, [queryClient]);

  const addMutation = useMutation({
    mutationFn: (sale: SaleRecord) =>
      api.post<BackendSale>("/sales", toSalePayload(sale)),
    onSuccess: invalidate,
  });

  const refundMutation = useMutation({
    mutationFn: ({
      saleId,
      refundAmount,
      reason,
    }: {
      saleId: string;
      refundAmount: number;
      reason: string;
    }) =>
      api.patch<BackendSale>(`/sales/${saleId}/refund`, {
        refundAmount,
        refundReason: reason,
      }),
    onSuccess: invalidate,
  });

  const createHeldMutation = useMutation({
    mutationFn: (held: HeldTransaction) =>
      api.post<HeldTransaction>("/sales/held", toHeldPayload(held)),
    onSuccess: invalidate,
  });

  const deleteHeldMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/sales/held/${id}`),
    onSuccess: invalidate,
  });

  const addSaleRecord = useCallback(
    (sale: SaleRecord) => addMutation.mutate(sale),
    [addMutation],
  );

  const refundSale = useCallback(
    (saleId: string, refundAmount: number, reason: string) =>
      refundMutation.mutate({ saleId, refundAmount, reason }),
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
    (held: HeldTransaction) => createHeldMutation.mutate(held),
    [createHeldMutation],
  );

  const deleteHeld = useCallback(
    (id: string) => deleteHeldMutation.mutate(id),
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
      setRecentSales,
      addSaleRecord,
      refundSale,
      getSaleById,
      heldTransactions,
      createHeld,
      deleteHeld,
      totalSalesAmount,
      totalItemsSold,
      isLoading: salesQuery.isLoading,
      isError: salesQuery.isError,
    }),
    [
      recentSales,
      setRecentSales,
      addSaleRecord,
      refundSale,
      getSaleById,
      heldTransactions,
      createHeld,
      deleteHeld,
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
