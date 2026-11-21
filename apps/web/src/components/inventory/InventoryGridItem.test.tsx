import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import InventoryGridItem from "./InventoryGridItem";
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
    <InventoryGridItem
      item={{ ...baseItem, ...overrides }}
      index={0}
      userRole="owner"
      onEdit={() => {}}
      onDelete={() => {}}
      onChangeStock={onChangeStock}
    />,
  );
}

describe("InventoryGridItem", () => {
  afterEach(() => cleanup());

  it("opens the stock dialog for someone who may change stock", () => {
    const onChangeStock = vi.fn();
    renderItem({}, onChangeStock);

    fireEvent.click(screen.getByRole("button", { name: /Change stock/ }));
    expect(onChangeStock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "i1" }),
    );
  });

  it("offers no stock button otherwise", () => {
    renderItem();
    expect(screen.queryByText("Change stock")).not.toBeInTheDocument();
  });

  it("flags products expiring soon and expired ones", () => {
    renderItem({ expiryDate: isoDay(10) });
    expect(screen.getByText("Expires soon")).toBeInTheDocument();
    cleanup();

    renderItem({ expiryDate: isoDay(-1) });
    expect(screen.getByText("Expired")).toBeInTheDocument();
    cleanup();

    renderItem({ expiryDate: isoDay(90) });
    expect(screen.queryByText("Expires soon")).not.toBeInTheDocument();
  });
});
