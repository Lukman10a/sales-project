import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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
  wholesalePrice: 5,
  sellingPrice: 10,
  quantity: 2,
  sold: 0,
  status: "in-stock",
  confirmedByApprentice: false,
  createdBy: "u1",
};

function renderItem(
  overrides: Partial<InventoryItem> = {},
  userRole = "owner",
  currentUserId?: string,
) {
  return render(
    <InventoryGridItem
      item={{ ...baseItem, ...overrides }}
      index={0}
      userRole={userRole}
      currentUserId={currentUserId}
      onEdit={() => {}}
      onDelete={() => {}}
      onConfirmReceipt={() => {}}
    />,
  );
}

describe("InventoryGridItem", () => {
  afterEach(() => cleanup());

  it("renders a confirm button for an owner on an unconfirmed item", () => {
    renderItem();

    expect(screen.getByText("Confirm Receipt")).toBeInTheDocument();
  });

  it("renders a confirm button for a manager on another user unconfirmed item", () => {
    renderItem({}, "manager", "m1");

    expect(screen.getByText("Confirm Receipt")).toBeInTheDocument();
  });

  it("does not render a confirm button for a manager on their own item", () => {
    renderItem({}, "manager", "u1");

    expect(screen.queryByText("Confirm Receipt")).not.toBeInTheDocument();
  });

  it("renders a confirm button for an apprentice on their own unconfirmed item", () => {
    renderItem({}, "apprentice", "u1");

    expect(screen.getByText("Confirm Receipt")).toBeInTheDocument();
  });

  it("does not render a confirm button for an apprentice on someone else item", () => {
    renderItem({}, "apprentice", "other");

    expect(screen.queryByText("Confirm Receipt")).not.toBeInTheDocument();
  });

  it("renders no confirm button once the item is confirmed", () => {
    renderItem({ confirmedByApprentice: true }, "owner");

    expect(screen.queryByText("Confirm Receipt")).not.toBeInTheDocument();
  });
});