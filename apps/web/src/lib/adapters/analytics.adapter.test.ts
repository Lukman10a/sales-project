import { describe, it, expect } from "vitest";
import {
  toAnalyticsSummary,
  toAnalyticsSalesChart,
  toAnalyticsCategoryBreakdown,
  toAnalyticsTopProducts,
} from "./analytics.adapter";
import type {
  AnalyticsSummaryResponse,
  AnalyticsSalesChartResponse,
  AnalyticsCategoryBreakdownResponse,
  AnalyticsTopProductsResponse,
} from "@/lib/api/types";

describe("analytics adapters", () => {
  it("toAnalyticsSummary rounds money and keeps counts/trends", () => {
    const backend: AnalyticsSummaryResponse = {
      period: "week",
      current: { revenue: 1234.567, orders: 12, netProfit: 500.005 },
      previous: { revenue: 900.11, orders: 9, netProfit: 400.1 },
      trends: { revenueChange: 37.2, ordersChange: 33.3, netProfitChange: 25 },
    };

    const summary = toAnalyticsSummary(backend);
    expect(summary.current.revenue).toBe(1234.57);
    expect(summary.current.netProfit).toBe(500.01);
    expect(summary.current.orders).toBe(12);
    expect(summary.trends.revenueChange).toBe(37.2);
  });

  it("toAnalyticsSalesChart maps buckets and rounds revenue", () => {
    const backend: AnalyticsSalesChartResponse = {
      period: "week",
      unit: "day",
      buckets: [
        { label: "2026-08-13", from: "a", to: "b", revenue: 100.999, orders: 2 },
      ],
    };

    const chart = toAnalyticsSalesChart(backend);
    expect(chart.unit).toBe("day");
    expect(chart.buckets[0]).toEqual({
      label: "2026-08-13",
      revenue: 101,
      orders: 2,
    });
  });

  it("toAnalyticsCategoryBreakdown maps rows and rounds revenue", () => {
    const backend: AnalyticsCategoryBreakdownResponse = {
      period: "week",
      data: [{ category: "Phones", units: 4, revenue: 250.555, orders: 3 }],
    };

    const breakdown = toAnalyticsCategoryBreakdown(backend);
    expect(breakdown.data[0]).toEqual({
      category: "Phones",
      units: 4,
      revenue: 250.56,
      orders: 3,
    });
  });

  it("toAnalyticsTopProducts maps rows and rounds revenue", () => {
    const backend: AnalyticsTopProductsResponse = {
      period: "week",
      data: [{ productId: "p1", name: "Phone", units: 7, revenue: 900.005 }],
    };

    const products = toAnalyticsTopProducts(backend);
    expect(products.data[0]).toEqual({
      productId: "p1",
      name: "Phone",
      units: 7,
      revenue: 900.01,
    });
  });
});