import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const mockUseActivityLog = vi.fn();

vi.mock("@/hooks/useActivityLog", () => ({
  useActivityLog: (...args: unknown[]) => mockUseActivityLog(...args),
}));

import ActivityLog from "./ActivityLog";

describe("ActivityLog", () => {
  beforeEach(() => {
    mockUseActivityLog.mockReset();
  });

  it("renders live entries with actor names", () => {
    mockUseActivityLog.mockReturnValue({
      data: {
        data: [
          {
            id: "sale-s1",
            userId: "u1",
            userName: "Alice",
            action: "Recorded Sale",
            entity: "sale",
            entityId: "s1",
            timestamp: "2026-01-21T11:00:00.000Z",
            details: "Sold 2 items for ₦45,000",
          },
          {
            id: "inventory-i1",
            userId: "u2",
            userName: "Bob",
            action: "Added Inventory",
            entity: "inventory",
            entityId: "i1",
            timestamp: "2026-01-21T10:00:00.000Z",
            details: "Added 10 units of Widget",
          },
        ],
        pagination: { page: 1, limit: 20, total: 2, pages: 1 },
      },
      isLoading: false,
      isError: false,
    });

    render(<ActivityLog />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText(/Recorded Sale/)).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText(/Added Inventory/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUseActivityLog.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    const { container } = render(<ActivityLog />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    mockUseActivityLog.mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } },
      isLoading: false,
      isError: false,
    });
    render(<ActivityLog />);
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });
});
