import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReports } from "./useReports";
import { createElement } from "react";
import type { ReactNode } from "react";
import type { BackendReport } from "@/lib/adapters/report.adapter";
import type { CreateReportInput, ReportListResponse } from "@/types/reportTypes";

const reportsApiMock = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/api/reports", () => ({ reportsApi: reportsApiMock }));

const backendReport: BackendReport = {
  id: "r1",
  name: "August Sales",
  type: "sales",
  format: "pdf",
  dateRange: { start: "2026-08-01", end: "2026-08-20" },
  status: "completed",
  snapshot: { type: "sales" },
  createdBy: "u1",
  createdByName: "Ada Lovelace",
  createdAt: "2026-08-20T10:00:00.000Z",
};

function listResponse(
  overrides: Partial<ReportListResponse> = {},
): ReportListResponse {
  return {
    data: [backendReport as unknown as ReportListResponse["data"][number]],
    total: 1,
    page: 1,
    limit: 20,
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    children,
  );
}

describe("useReports", () => {
  beforeEach(() => {
    reportsApiMock.list.mockReset();
    reportsApiMock.get.mockReset();
    reportsApiMock.create.mockReset();
    reportsApiMock.remove.mockReset();
    reportsApiMock.list.mockResolvedValue(listResponse());
  });

  it("fetches the reports list on mount and adapts rows", async () => {
    const { result } = renderHook(() => useReports(), { wrapper });

    await waitFor(() => expect(result.current.reports.length).toBe(1));
    expect(reportsApiMock.list).toHaveBeenCalledWith(1, 20);
    expect(result.current.reports[0].createdByName).toBe("Ada Lovelace");
    expect(result.current.total).toBe(1);
  });

  it("creates a report then refetches the list", async () => {
    reportsApiMock.create.mockResolvedValue({
      ...backendReport,
      id: "r2",
    });
    reportsApiMock.list
      .mockResolvedValueOnce(listResponse())
      .mockResolvedValueOnce(
        listResponse({
          data: [
            backendReport as unknown as ReportListResponse["data"][number],
            { ...backendReport, id: "r2" } as unknown as ReportListResponse["data"][number],
          ],
          total: 2,
        }),
      );

    const { result } = renderHook(() => useReports(), { wrapper });
    await waitFor(() => expect(result.current.reports.length).toBe(1));

    const input: CreateReportInput = {
      name: "New Report",
      type: "sales",
      format: "csv",
      dateRange: { start: "2026-08-01", end: "2026-08-20" },
    };
    await result.current.createReport(input);

    expect(reportsApiMock.create).toHaveBeenCalledWith(input);
    await waitFor(() => expect(result.current.reports.length).toBe(2));
  });

  it("deletes a report then refetches the list", async () => {
    reportsApiMock.remove.mockResolvedValue(undefined);
    reportsApiMock.list
      .mockResolvedValueOnce(listResponse())
      .mockResolvedValueOnce(listResponse({ data: [], total: 0 }));

    const { result } = renderHook(() => useReports(), { wrapper });
    await waitFor(() => expect(result.current.reports.length).toBe(1));

    await result.current.deleteReport("r1");

    expect(reportsApiMock.remove).toHaveBeenCalledWith("r1");
    await waitFor(() => expect(result.current.reports.length).toBe(0));
  });
});