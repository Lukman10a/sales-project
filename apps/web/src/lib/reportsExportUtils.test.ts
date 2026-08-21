import { describe, it, expect } from "vitest";
import { exportReportCsv } from "./reportsExportUtils";
import type { Report } from "@/types/reportTypes";

function report(overrides: Partial<Report> = {}): Report {
  return {
    id: "r1",
    name: "August Sales",
    type: "sales",
    format: "pdf",
    status: "completed",
    createdAt: "2026-08-20T10:00:00.000Z",
    createdBy: "u1",
    createdByName: "Ada Lovelace",
    dateRange: { start: "2026-08-01", end: "2026-08-20" },
    ...overrides,
  };
}

describe("reportsExportUtils", () => {
  it("builds a CSV from snapshot items", () => {
    const csv = exportReportCsv(
      report({
        snapshot: {
          type: "sales",
          items: [
            { id: "s1", customerName: "Ada", total: 100 },
            { id: "s2", customerName: "Grace", total: 50 },
          ],
        },
      }),
    );

    expect(csv).toContain('"id","customerName","total"');
    expect(csv).toContain('"s1","Ada",100');
    expect(csv).toContain('"s2","Grace",50');
  });

  it("builds a CSV from a summary-only snapshot", () => {
    const csv = exportReportCsv(
      report({
        snapshot: {
          type: "profit",
          summary: { revenue: 100, orders: 2, netProfit: 40 },
        },
      }),
    );

    expect(csv).toContain('"revenue",100');
    expect(csv).toContain('"orders",2');
  });

  it("returns an empty string when the snapshot is missing", () => {
    expect(exportReportCsv(report())).toBe("");
  });

  it("escapes double quotes inside cell values", () => {
    const csv = exportReportCsv(
      report({
        snapshot: { items: [{ name: 'Ada "Pioneer"' }] },
      }),
    );

    expect(csv).toContain('"Ada ""Pioneer"""');
  });
});