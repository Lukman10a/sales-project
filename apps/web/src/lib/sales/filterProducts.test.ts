import { describe, it, expect } from "vitest";
import { filterProducts } from "./filterProducts";
import type { SaleItem } from "@/types/salesTypes";

function product(overrides: Partial<SaleItem> = {}): SaleItem {
  return {
    id: "p1",
    name: "Wireless Earbuds Pro",
    image: "img.png",
    sellingPrice: 25000,
    availableQty: 15,
    categories: ["Accessories"],
    ...overrides,
  };
}

describe("filterProducts", () => {
  it("keeps items matching the search query", () => {
    const result = filterProducts(
      [product(), product({ id: "p2", name: "USB-C Charger" })],
      "usb",
      "All",
    );

    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("keeps items in the selected category when not 'All'", () => {
    const result = filterProducts(
      [
        product(),
        product({ id: "p2", categories: ["Phones"] }),
        product({ id: "p3", categories: ["Gadgets"] }),
      ],
      "",
      "Phones",
    );

    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("applies name and category filters together", () => {
    const result = filterProducts(
      [
        product({ id: "p1", name: "Wireless Earbuds", categories: ["Accessories"] }),
        product({ id: "p2", name: "Wireless Mouse", categories: ["Gadgets"] }),
        product({ id: "p3", name: "Earbuds Cable", categories: ["Accessories"] }),
      ],
      "wireless",
      "Gadgets",
    );

    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("returns nothing when no item matches", () => {
    const result = filterProducts([product()], "zzz", "All");

    expect(result).toEqual([]);
  });

  it("treats items without categories as unmatched for a specific category", () => {
    const result = filterProducts(
      [product({ categories: undefined }), product({ categories: [] })],
      "",
      "Phones",
    );

    expect(result).toEqual([]);
  });
});