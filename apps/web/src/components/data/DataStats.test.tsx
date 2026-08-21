import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const inventoryMock = vi.hoisted(() => ({
  inventory: [] as any[],
  lowStockItems: 0,
  outOfStockItems: 0,
  isLoading: false,
  isError: false,
  totalItemsInStock: 0,
}));
const salesMock = vi.hoisted(() => ({
  recentSales: [] as any[],
  totalSalesAmount: 0,
  isLoading: false,
  isError: false,
}));
const teamMock = vi.hoisted(() => ({
  teamMembers: [] as any[],
  isLoading: false,
  isError: false,
}));

vi.mock("@/contexts/InventoryDataContext", () => ({
  useInventoryData: () => inventoryMock,
}));
vi.mock("@/contexts/SalesDataContext", () => ({
  useSalesData: () => salesMock,
}));
vi.mock("@/contexts/TeamDataContext", () => ({
  useTeamData: () => teamMock,
}));

import DataStats from "./DataStats";

describe("DataStats", () => {
  afterEach(() => cleanup());

  it("renders live counts from inventory, sales and team", () => {
    inventoryMock.inventory = [
      { id: "1", quantity: 5, status: "in-stock" },
      { id: "2", quantity: 1, status: "low-stock" },
      { id: "3", quantity: 0, status: "out-of-stock" },
    ];
    inventoryMock.lowStockItems = 1;
    inventoryMock.outOfStockItems = 1;
    inventoryMock.totalItemsInStock = 1;
    salesMock.recentSales = [
      { id: "s1", total: 5000, status: "completed", items: [] },
      { id: "s2", total: 3000, status: "completed", items: [] },
    ];
    salesMock.totalSalesAmount = 8000;
    teamMock.teamMembers = [
      { id: "t1", name: "A" },
      { id: "t2", name: "B" },
    ];

    render(<DataStats />);

    // Total Items card shows inventory length 3
    expect(screen.getByText("Total Items")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    // Team Size card shows 2 - use getAllByText since multiple 2s appear
    expect(screen.getByText("Team Size")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(2);

    // Total Sales card shows count or amount - check for formatted amount
    expect(screen.getByText("Total Sales")).toBeInTheDocument();
    expect(screen.getByText(/8,000|8000|₦/)).toBeInTheDocument();

    // Low Stock card
    expect(screen.getByText("Low Stock")).toBeInTheDocument();
  });

  it("handles empty inventory gracefully", () => {
    inventoryMock.inventory = [];
    inventoryMock.lowStockItems = 0;
    inventoryMock.outOfStockItems = 0;
    salesMock.recentSales = [];
    salesMock.totalSalesAmount = 0;
    teamMock.teamMembers = [];
    render(<DataStats />);
    expect(screen.getByText("Total Items")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });
});
