import { roundCurrency } from "./currency";
import type {
  AnalyticsCategoryBreakdownResponse,
  AnalyticsSalesChartResponse,
  AnalyticsSummaryResponse,
  AnalyticsTopProductsResponse,
} from "@/lib/api/types";

export interface AnalyticsSummaryData {
  period: string;
  current: { revenue: number; orders: number; netProfit: number };
  previous: { revenue: number; orders: number; netProfit: number };
  trends: {
    revenueChange: number;
    ordersChange: number;
    netProfitChange: number;
  };
}

export function toAnalyticsSummary(
  data: AnalyticsSummaryResponse,
): AnalyticsSummaryData {
  return {
    period: data.period,
    current: {
      revenue: roundCurrency(data.current.revenue),
      orders: data.current.orders,
      netProfit: roundCurrency(data.current.netProfit),
    },
    previous: {
      revenue: roundCurrency(data.previous.revenue),
      orders: data.previous.orders,
      netProfit: roundCurrency(data.previous.netProfit),
    },
    trends: {
      revenueChange: data.trends.revenueChange,
      ordersChange: data.trends.ordersChange,
      netProfitChange: data.trends.netProfitChange,
    },
  };
}

export interface AnalyticsSalesChartData {
  period: string;
  unit: string;
  buckets: Array<{
    label: string;
    revenue: number;
    orders: number;
  }>;
}

export function toAnalyticsSalesChart(
  data: AnalyticsSalesChartResponse,
): AnalyticsSalesChartData {
  return {
    period: data.period,
    unit: data.unit,
    buckets: data.buckets.map((bucket) => ({
      label: bucket.label,
      revenue: roundCurrency(bucket.revenue),
      orders: bucket.orders,
    })),
  };
}

export interface AnalyticsCategoryBreakdownData {
  period: string;
  data: Array<{
    category: string;
    units: number;
    revenue: number;
    orders: number;
  }>;
}

export function toAnalyticsCategoryBreakdown(
  data: AnalyticsCategoryBreakdownResponse,
): AnalyticsCategoryBreakdownData {
  return {
    period: data.period,
    data: data.data.map((row) => ({
      category: row.category,
      units: row.units,
      revenue: roundCurrency(row.revenue),
      orders: row.orders,
    })),
  };
}

export interface AnalyticsTopProductsData {
  period: string;
  data: Array<{
    productId: string;
    name: string;
    units: number;
    revenue: number;
  }>;
}

export function toAnalyticsTopProducts(
  data: AnalyticsTopProductsResponse,
): AnalyticsTopProductsData {
  return {
    period: data.period,
    data: data.data.map((row) => ({
      productId: row.productId,
      name: row.name,
      units: row.units,
      revenue: roundCurrency(row.revenue),
    })),
  };
}