import { api } from "./client";
import type {
  AnalyticsCategoryBreakdownResponse,
  AnalyticsPeriod,
  AnalyticsSalesChartResponse,
  AnalyticsSummaryResponse,
  AnalyticsTopProductsResponse,
  DashboardResponse,
} from "./types";

export const analyticsApi = {
  getDashboard: () => api.get<DashboardResponse>("/dashboard"),
  getSummary: (period: AnalyticsPeriod) =>
    api.get<AnalyticsSummaryResponse>(`/analytics/summary?period=${period}`),
  getSalesChart: (period: AnalyticsPeriod) =>
    api.get<AnalyticsSalesChartResponse>(
      `/analytics/sales-chart?period=${period}`,
    ),
  getCategoryBreakdown: (period: AnalyticsPeriod) =>
    api.get<AnalyticsCategoryBreakdownResponse>(
      `/analytics/category-breakdown?period=${period}`,
    ),
  getTopProducts: (period: AnalyticsPeriod) =>
    api.get<AnalyticsTopProductsResponse>(
      `/analytics/top-products?period=${period}`,
    ),
};