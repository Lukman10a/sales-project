"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";
import {
  toAnalyticsSummary,
  toAnalyticsSalesChart,
  toAnalyticsCategoryBreakdown,
  toAnalyticsTopProducts,
} from "@/lib/adapters/analytics.adapter";
import type { AnalyticsPeriod } from "@/lib/api/types";

export function useAnalytics(period: AnalyticsPeriod, enabled = true) {
  const summary = useQuery({
    queryKey: ["analytics", "summary", period],
    queryFn: () => analyticsApi.getSummary(period).then(toAnalyticsSummary),
    enabled,
  });

  const salesChart = useQuery({
    queryKey: ["analytics", "sales-chart", period],
    queryFn: () =>
      analyticsApi.getSalesChart(period).then(toAnalyticsSalesChart),
    enabled,
  });

  const categoryBreakdown = useQuery({
    queryKey: ["analytics", "category-breakdown", period],
    queryFn: () =>
      analyticsApi.getCategoryBreakdown(period).then(toAnalyticsCategoryBreakdown),
    enabled,
  });

  const topProducts = useQuery({
    queryKey: ["analytics", "top-products", period],
    queryFn: () =>
      analyticsApi.getTopProducts(period).then(toAnalyticsTopProducts),
    enabled,
  });

  return { summary, salesChart, categoryBreakdown, topProducts };
}