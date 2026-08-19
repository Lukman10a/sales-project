import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAnalytics } from "./useAnalytics";
import type { ReactNode } from "react";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ api: apiMock }));

import type {
  AnalyticsCategoryBreakdownResponse,
  AnalyticsSalesChartResponse,
  AnalyticsSummaryResponse,
  AnalyticsTopProductsResponse,
} from "@/lib/api/types";

const summary: AnalyticsSummaryResponse = {
  period: "week",
  current: { revenue: 1234.567, orders: 12, netProfit: 500.005 },
  previous: { revenue: 900.11, orders: 9, netProfit: 400.1 },
  trends: { revenueChange: 37.2, ordersChange: 33.3, netProfitChange: 25 },
};

const salesChart: AnalyticsSalesChartResponse = {
  period: "week",
  unit: "day",
  buckets: [
    { label: "2026-08-13", from: "a", to: "b", revenue: 100.999, orders: 2 },
  ],
};

const category: AnalyticsCategoryBreakdownResponse = {
  period: "week",
  data: [{ category: "Phones", units: 4, revenue: 250.555, orders: 3 }],
};

const topProducts: AnalyticsTopProductsResponse = {
  period: "week",
  data: [{ productId: "p1", name: "Phone", units: 7, revenue: 900.005 }],
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAnalytics", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.get.mockImplementation(async (path: string) => {
      if (path.includes("/summary")) return summary;
      if (path.includes("/sales-chart")) return salesChart;
      if (path.includes("/category-breakdown")) return category;
      if (path.includes("/top-products")) return topProducts;
      throw new Error(`Unexpected path ${path}`);
    });
  });

  it("calls the four analytics endpoints for the requested period (week default)", async () => {
    const { result } = renderHook(() => useAnalytics("week"), { wrapper });

    await waitFor(() => expect(result.current.summary.data).toBeDefined());
    expect(apiMock.get).toHaveBeenCalledWith("/analytics/summary?period=week");
    expect(apiMock.get).toHaveBeenCalledWith("/analytics/sales-chart?period=week");
    expect(apiMock.get).toHaveBeenCalledWith(
      "/analytics/category-breakdown?period=week",
    );
    expect(apiMock.get).toHaveBeenCalledWith("/analytics/top-products?period=week");
  });

  it("adapts each response (money rounded, counts kept)", async () => {
    const { result } = renderHook(() => useAnalytics("week"), { wrapper });

    await waitFor(() => expect(result.current.summary.data).toBeDefined());
    expect(result.current.summary.data?.current.revenue).toBe(1234.57);
    expect(result.current.salesChart.data?.buckets[0].revenue).toBe(101);
    expect(result.current.categoryBreakdown.data?.data[0].revenue).toBe(250.56);
    expect(result.current.topProducts.data?.data[0].revenue).toBe(900.01);
  });

  it("does not fire any analytics request when disabled (gate holds)", async () => {
    renderHook(() => useAnalytics("week", false), { wrapper });

    expect(apiMock.get).not.toHaveBeenCalled();
  });
});