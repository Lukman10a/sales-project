"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";
import { toDashboard } from "@/lib/adapters/dashboard.adapter";
import type { DashboardData } from "@/lib/adapters/dashboard.adapter";

export function useDashboard(enabled = true) {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => analyticsApi.getDashboard().then(toDashboard),
    enabled,
  });
}