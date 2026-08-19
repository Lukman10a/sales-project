import { describe, it, expect } from "vitest";
import { toDashboard } from "./dashboard.adapter";
import type { DashboardResponse } from "@/lib/api/types";

const backend: DashboardResponse = {
  metrics: {
    totalRevenue: 1234.567,
    totalOrders: 42,
    netProfit: 300.115,
    todayRevenue: 99.99,
    todayOrders: 3,
    lowStockCount: 2,
    outOfStockCount: 1,
  },
  inventory: {
    totalProducts: 10,
    byStatus: { "in-stock": 7, "low-stock": 2, "out-of-stock": 1 },
    lowStockItems: [],
  },
  topProducts: [
    { productId: "p1", name: "Phone", units: 5, revenue: 1000.005 },
  ],
  recentSales: [
    {
      id: "s1",
      total: 50.555,
      status: "completed",
      saleDate: "2026-08-19T10:00:00.000Z",
      customerName: "Ada",
      paymentMethod: "cash",
    },
  ],
};

describe("toDashboard", () => {
  it("rounds money to two decimals", () => {
    const dashboard = toDashboard(backend);
    expect(dashboard.metrics.totalRevenue).toBe(1234.57);
    expect(dashboard.metrics.netProfit).toBe(300.12);
    expect(dashboard.metrics.todayRevenue).toBe(99.99);
  });

  it("keeps integer counts and byStatus as-is", () => {
    const dashboard = toDashboard(backend);
    expect(dashboard.metrics.totalOrders).toBe(42);
    expect(dashboard.metrics.todayOrders).toBe(3);
    expect(dashboard.metrics.lowStockCount).toBe(2);
    expect(dashboard.inventory.totalProducts).toBe(10);
    expect(dashboard.inventory.byStatus["in-stock"]).toBe(7);
    expect(dashboard.inventory.lowStockItems).toEqual([]);
  });

  it("adapts top products and recent sales", () => {
    const dashboard = toDashboard(backend);
    expect(dashboard.topProducts[0]).toEqual({
      productId: "p1",
      name: "Phone",
      units: 5,
      revenue: 1000.01,
    });
    expect(dashboard.recentSales[0].total).toBe(50.56);
    expect(dashboard.recentSales[0].saleDate).toBe(
      "2026-08-19T10:00:00.000Z",
    );
    expect(dashboard.recentSales[0].customerName).toBe("Ada");
  });
});