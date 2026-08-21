"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api/reports";
import { mapReportBackend } from "@/lib/adapters/report.adapter";
import type { CreateReportInput } from "@/types/reportTypes";

export function useReports() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["reports"],
    queryFn: () => reportsApi.list(1, 20),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateReportInput) => reportsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const response = listQuery.data;
  return {
    reports: (response?.data ?? []).map(mapReportBackend),
    total: response?.total ?? 0,
    page: response?.page ?? 1,
    limit: response?.limit ?? 20,
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    createReport: (input: CreateReportInput) =>
      createMutation.mutateAsync(input),
    deleteReport: (id: string) => deleteMutation.mutateAsync(id),
  };
}