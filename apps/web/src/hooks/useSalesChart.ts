"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";
import { toAnalyticsSalesChart } from "@/lib/adapters/analytics.adapter";
import type { AnalyticsPeriod } from "@/lib/api/types";

export function useSalesChart(period: AnalyticsPeriod, enabled = true) {
  return useQuery({
    queryKey: ["analytics", "sales-chart", period],
    queryFn: () =>
      analyticsApi.getSalesChart(period).then(toAnalyticsSalesChart),
    enabled,
  });
}