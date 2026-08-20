import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ItemBasicInfoCard from "./ItemDetailCards";
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
  createdByName: "Ada Lovelace",
};

describe("ItemBasicInfoCard", () => {
  afterEach(() => cleanup());

  it("shows the creator name", () => {
    render(<ItemBasicInfoCard item={baseItem} />);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("shows the confirmer name and date once confirmed", () => {
    render(
      <ItemBasicInfoCard
        item={{
          ...baseItem,
          confirmedBy: "u2",
          confirmedAt: "2026-08-02T10:00:00.000Z",
          confirmedByName: "Grace Hopper",
        }}
      />,
    );

    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(
      screen.getByText(new Date("2026-08-02T10:00:00.000Z").toLocaleDateString()),
    ).toBeInTheDocument();
  });

  it("does not show a confirmer row before confirmation", () => {
    render(<ItemBasicInfoCard item={baseItem} />);

    expect(screen.queryByText("Confirmed by")).not.toBeInTheDocument();
  });
});