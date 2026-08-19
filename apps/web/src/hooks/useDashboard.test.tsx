import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboard } from "./useDashboard";
import type { ReactNode } from "react";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ api: apiMock }));

import type { DashboardResponse } from "@/lib/api/types";

const dashboardResponse: DashboardResponse = {
  metrics: {
    totalRevenue: 1000.005,
    totalOrders: 10,
    netProfit: 200.345,
    todayRevenue: 50.5,
    todayOrders: 2,
    lowStockCount: 1,
    outOfStockCount: 0,
  },
  inventory: {
    totalProducts: 5,
    byStatus: { "in-stock": 4, "low-stock": 1, "out-of-stock": 0 },
    lowStockItems: [],
  },
  topProducts: [{ productId: "p1", name: "Phone", units: 2, revenue: 100 }],
  recentSales: [
    {
      id: "s1",
      total: 50,
      status: "completed",
      saleDate: "2026-08-19T10:00:00.000Z",
      paymentMethod: "cash",
    },
  ],
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useDashboard", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.get.mockResolvedValue(dashboardResponse);
  });

  it("fetches GET /dashboard with the ['dashboard'] query key", async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(apiMock.get).toHaveBeenCalledWith("/dashboard");
  });

  it("adapts the response (money rounded, counts kept)", async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.metrics.totalRevenue).toBe(1000.01);
    expect(result.current.data?.metrics.netProfit).toBe(200.35);
    expect(result.current.data?.metrics.totalOrders).toBe(10);
    expect(result.current.data?.topProducts[0].revenue).toBe(100);
    expect(result.current.data?.recentSales[0].total).toBe(50);
  });

  it("does not fetch GET /dashboard when disabled (gate holds)", async () => {
    renderHook(() => useDashboard(false), { wrapper });

    expect(apiMock.get).not.toHaveBeenCalled();
  });
});