import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const inventoryMock = vi.hoisted(() => ({
  inventory: [] as any[],
  lowStockItems: 0,
  outOfStockItems: 0,
  isLoading: false,
}));
const salesMock = vi.hoisted(() => ({
  recentSales: [] as any[],
  isLoading: false,
}));

vi.mock("@/contexts/InventoryDataContext", () => ({
  useInventoryData: () => inventoryMock,
}));
vi.mock("@/contexts/SalesDataContext", () => ({
  useSalesData: () => salesMock,
}));

import { useIntegrityCheck } from "./useIntegrityCheck";

describe("useIntegrityCheck", () => {
  beforeEach(() => {
    inventoryMock.inventory = [
      { id: "1", quantity: 5, status: "in-stock" },
      { id: "2", quantity: 2, status: "low-stock" },
      { id: "3", quantity: 0, status: "out-of-stock" },
    ];
    inventoryMock.lowStockItems = 1;
    inventoryMock.outOfStockItems = 1;
    inventoryMock.isLoading = false;
    salesMock.recentSales = [
      { id: "s1", total: 100, status: "completed", items: [{ name: "A", quantity: 1, price: 100 }] },
    ];
    salesMock.isLoading = false;
  });

  it("returns passed checks when data is consistent", () => {
    const { result } = renderHook(() => useIntegrityCheck());
    const checks = result.current.checks;
    expect(checks.length).toBeGreaterThan(0);
    // all should be passed when consistent
    const failed = checks.filter((c) => c.status === "failed");
    expect(failed.length).toBe(0);
    // at least one passed
    expect(checks.some((c) => c.status === "passed")).toBe(true);
  });

  it("detects negative quantities as failed", () => {
    inventoryMock.inventory = [
      { id: "1", quantity: -3, status: "in-stock" },
    ];
    inventoryMock.lowStockItems = 0;
    inventoryMock.outOfStockItems = 0;
    const { result } = renderHook(() => useIntegrityCheck());
    const negativeCheck = result.current.checks.find((c) => c.name.includes("negative") || c.id.includes("negative"));
    expect(negativeCheck).toBeDefined();
    expect(negativeCheck!.status).toBe("failed");
  });

  it("recomputes when inventory changes", () => {
    const { result, rerender } = renderHook(() => useIntegrityCheck());
    expect(result.current.checks.find((c) => c.id.includes("negative"))?.status).toBe("passed");
    inventoryMock.inventory = [{ id: "1", quantity: -1, status: "in-stock" }];
    rerender();
    expect(result.current.checks.find((c) => c.id.includes("negative"))?.status).toBe("failed");
  });

  it("exposes isLoading and runCheck", () => {
    const { result } = renderHook(() => useIntegrityCheck());
    expect(typeof result.current.isLoading).toBe("boolean");
    expect(typeof result.current.runCheck).toBe("function");
  });

  it("detects low-stock count mismatch as warning", () => {
    inventoryMock.inventory = [
      { id: "1", quantity: 2, status: "low-stock" },
      { id: "2", quantity: 2, status: "low-stock" },
    ];
    inventoryMock.lowStockItems = 999; // mismatch
    inventoryMock.outOfStockItems = 0;
    const { result } = renderHook(() => useIntegrityCheck());
    const lowCheck = result.current.checks.find((c) => c.name.includes("Low-stock") || c.id.includes("low-stock"));
    expect(lowCheck).toBeDefined();
    expect(lowCheck!.status).toBe("warning");
  });
});
