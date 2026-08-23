import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ api: apiMock }));

import { useActivityLog } from "./useActivityLog";

import { createElement } from "react";
function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe("useActivityLog", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
  });

  it("fetches /team/activity with pagination and maps via adapter", async () => {
    apiMock.get.mockResolvedValue({
      data: [
        {
          id: "sale-s1",
          userId: "u1",
          userName: "Alice",
          action: "Recorded Sale",
          entity: "sale",
          entityId: "s1",
          timestamp: "2026-01-21T11:00:00.000Z",
          details: "Sold 2 items",
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });

    const { result } = renderHook(() => useActivityLog(1, 20), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(apiMock.get).toHaveBeenCalledWith("/team/activity?page=1&limit=20");
    expect(result.current.data?.data[0].userName).toBe("Alice");
    expect(result.current.data?.pagination.total).toBe(1);
  });

  it("supports page 2", async () => {
    apiMock.get.mockResolvedValue({ data: [], pagination: { page: 2, limit: 20, total: 0, pages: 1 } });
    const { result } = renderHook(() => useActivityLog(2, 20), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(apiMock.get).toHaveBeenCalledWith("/team/activity?page=2&limit=20");
  });
});
