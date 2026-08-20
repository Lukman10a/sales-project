import { describe, it, expect } from "vitest";
import { toInventoryItem } from "./inventory.adapter";
import type { BackendInventoryItem } from "./inventory.adapter";

function backendItem(
  overrides: Partial<BackendInventoryItem> = {},
): BackendInventoryItem {
  return {
    id: "i1",
    name: "Widget",
    category: ["tools"],
    image: "img.png",
    wholesalePrice: "100.00",
    sellingPrice: "150.00",
    quantity: 8,
    sold: 2,
    status: "in-stock",
    confirmedByApprentice: false,
    ...overrides,
  };
}

describe("inventory adapter", () => {
  it("coerces decimal price strings to numbers rounded to 2dp", () => {
    const item = toInventoryItem(
      backendItem({
        wholesalePrice: "150.005",
        sellingPrice: "185.555",
      }),
    );

    expect(item.wholesalePrice).toBe(150.01);
    expect(item.sellingPrice).toBe(185.56);
  });

  it("rounds bundlePrice decimals to 2dp", () => {
    const item = toInventoryItem(backendItem({ bundlePrice: "12000.005" }));

    expect(item.bundlePrice).toBe(12000.01);
  });

  it("maps a null image to an empty string", () => {
    const item = toInventoryItem(backendItem({ image: null }));

    expect(item.image).toBe("");
  });

  it("maps a null lastRestocked to undefined", () => {
    const item = toInventoryItem(backendItem({ lastRestocked: null }));

    expect(item.lastRestocked).toBeUndefined();
  });

  it("maps a lastRestocked date to an ISO string", () => {
    const item = toInventoryItem(backendItem({ lastRestocked: "2026-08-01" }));

    expect(item.lastRestocked).toBe("2026-08-01T00:00:00.000Z");
  });

  it("normalises a single-string category into an array", () => {
    const item = toInventoryItem(backendItem({ category: "Phones" }));

    expect(item.category).toEqual(["Phones"]);
  });

  it("passes quantity, sold, status, and confirmedByApprentice through", () => {
    const item = toInventoryItem(
      backendItem({
        quantity: 3,
        sold: 9,
        status: "low-stock",
        confirmedByApprentice: true,
      }),
    );

    expect(item.quantity).toBe(3);
    expect(item.sold).toBe(9);
    expect(item.status).toBe("low-stock");
    expect(item.confirmedByApprentice).toBe(true);
  });

  it("maps createdBy and createdByName onto the item", () => {
    const item = toInventoryItem(
      backendItem({ createdBy: "u1", createdByName: "Ada Lovelace" }),
    );

    expect(item.createdBy).toBe("u1");
    expect(item.createdByName).toBe("Ada Lovelace");
  });

  it("leaves creator fields undefined when absent", () => {
    const item = toInventoryItem(backendItem());

    expect(item.createdBy).toBeUndefined();
    expect(item.createdByName).toBeUndefined();
  });
});