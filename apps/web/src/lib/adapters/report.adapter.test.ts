import { describe, it, expect } from "vitest";
import { mapReportBackend } from "./report.adapter";
import type { BackendReport } from "./report.adapter";

function backendReport(overrides: Partial<BackendReport> = {}): BackendReport {
  return {
    id: "r1",
    name: "August Sales",
    type: "sales",
    format: "pdf",
    dateRange: { start: "2026-08-01", end: "2026-08-20" },
    status: "completed",
    snapshot: { type: "sales", summary: { totalSales: 100 } },
    createdBy: "u1",
    createdByName: "Ada Lovelace",
    createdAt: "2026-08-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("report adapter", () => {
  it("maps a backend report into the front Report shape", () => {
    const report = mapReportBackend(backendReport());

    expect(report.id).toBe("r1");
    expect(report.name).toBe("August Sales");
    expect(report.type).toBe("sales");
    expect(report.format).toBe("pdf");
    expect(report.dateRange).toEqual({
      start: "2026-08-01",
      end: "2026-08-20",
    });
    expect(report.status).toBe("completed");
    expect(report.createdBy).toBe("u1");
    expect(report.createdByName).toBe("Ada Lovelace");
    expect(report.snapshot).toEqual({
      type: "sales",
      summary: { totalSales: 100 },
    });
  });

  it("normalizes createdAt to an ISO string", () => {
    const report = mapReportBackend(
      backendReport({ createdAt: new Date("2026-08-20T10:00:00.000Z") }),
    );

    expect(report.createdAt).toBe("2026-08-20T10:00:00.000Z");
  });

  it("omits createdByName when absent and snapshot when null", () => {
    const report = mapReportBackend(
      backendReport({ createdByName: undefined, snapshot: null }),
    );

    expect(report.createdByName).toBeUndefined();
    expect(report.snapshot).toBeUndefined();
  });
});