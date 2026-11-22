import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import InventoryListItem from "./InventoryListItem";
import type { InventoryItem } from "@/types/inventoryTypes";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    formatCurrency: (amount: number) => `₦${amount}`,
  }),
}));

const baseItem: InventoryItem = {
  id: "i1",
  name: "Widget",
  category: [],
  image: "",
  costPrice: 5,
  sellingPrice: 10,
  quantity: 2,
  sold: 0,
  status: "in-stock",
  createdBy: "u1",
};

const isoDay = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function renderItem(
  overrides: Partial<InventoryItem> = {},
  onChangeStock?: (item: InventoryItem) => void,
) {
  return render(
    <InventoryListItem
      item={{ ...baseItem, ...overrides }}
      userRole="owner"
      onEdit={() => {}}
      onDelete={() => {}}
      onChangeStock={onChangeStock}
    />,
  );
}

describe("InventoryListItem", () => {
  afterEach(() => cleanup());

  it("opens the stock dialog from the Stock button", () => {
    const onChangeStock = vi.fn();
    renderItem({}, onChangeStock);

    fireEvent.click(screen.getByRole("button", { name: "Stock" }));
    expect(onChangeStock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "i1" }),
    );
  });

  it("hides the Stock button without permission", () => {
    renderItem();
    expect(screen.queryByRole("button", { name: "Stock" })).not.toBeInTheDocument();
  });

  it("shows an expiry warning only near or past the date", () => {
    renderItem({ expiryDate: isoDay(5) });
    expect(screen.getByText("Expires {date}")).toBeInTheDocument();
    cleanup();

    renderItem({ expiryDate: isoDay(-2) });
    expect(screen.getByText("Expired {date}")).toBeInTheDocument();
    cleanup();

    renderItem({ expiryDate: isoDay(120) });
    expect(screen.queryByText(/Expire/)).not.toBeInTheDocument();
  });
});
