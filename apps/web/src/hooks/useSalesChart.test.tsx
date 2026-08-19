import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSalesChart } from "./useSalesChart";
import type { ReactNode } from "react";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ api: apiMock }));

import type { AnalyticsSalesChartResponse } from "@/lib/api/types";

const salesChart: AnalyticsSalesChartResponse = {
  period: "week",
  unit: "day",
  buckets: [
    { label: "2026-08-13", from: "a", to: "b", revenue: 100.999, orders: 2 },
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

describe("useSalesChart", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.get.mockResolvedValue(salesChart);
  });

  it("fetches only GET /analytics/sales-chart for the requested period", async () => {
    const { result } = renderHook(() => useSalesChart("week"), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(apiMock.get).toHaveBeenCalledWith("/analytics/sales-chart?period=week");
  });

  it("adapts the response (money rounded)", async () => {
    const { result } = renderHook(() => useSalesChart("week"), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.buckets[0].revenue).toBe(101);
  });

  it("does not fetch when disabled (gate holds)", async () => {
    renderHook(() => useSalesChart("week", false), { wrapper });

    expect(apiMock.get).not.toHaveBeenCalled();
  });
});