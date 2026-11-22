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
  costPrice: 5,
  sellingPrice: 10,
  quantity: 2,
  sold: 0,
  status: "in-stock",
  createdBy: "u1",
  createdByName: "Ada Lovelace",
};

describe("ItemBasicInfoCard", () => {
  afterEach(() => cleanup());

  it("shows the creator name", () => {
    render(<ItemBasicInfoCard item={baseItem} />);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("shows the expiry date when set", () => {
    render(<ItemBasicInfoCard item={{ ...baseItem, expiryDate: "2030-01-31" }} />);

    expect(screen.getByText("Expiry date")).toBeInTheDocument();
    expect(screen.getByText("2030-01-31")).toBeInTheDocument();
  });
});