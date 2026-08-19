import { describe, it, expect } from "vitest";
import { toInventoryPayload } from "./payloads";
import type { InventoryItem } from "@/types/inventoryTypes";

describe("toInventoryPayload", () => {
  it("passes image, lastRestocked, and confirmedByApprentice through", () => {
    const payload = toInventoryPayload({
      name: "Widget",
      sellingPrice: 150,
      image: "img.png",
      lastRestocked: "2026-08-01T00:00:00.000Z",
      confirmedByApprentice: true,
    });

    expect(payload).toEqual({
      name: "Widget",
      sellingPrice: 150,
      image: "img.png",
      lastRestocked: "2026-08-01T00:00:00.000Z",
      confirmedByApprentice: true,
    });
  });

  it("omits an empty-string image", () => {
    const payload = toInventoryPayload({ name: "Widget", image: "" });

    expect(payload.image).toBeUndefined();
  });

  it("never sends id, sold, or status", () => {
    const payload = toInventoryPayload({
      id: "i1",
      name: "Widget",
      sold: 4,
      status: "low-stock",
      sellingPrice: 100,
    });

    expect(payload).toEqual({ name: "Widget", sellingPrice: 100 });
  });

  it("omits an empty category array", () => {
    const payload = toInventoryPayload({
      name: "Widget",
      category: [],
      sellingPrice: 100,
    });

    expect(payload.category).toBeUndefined();
  });

  it("omits undefined optional fields", () => {
    const payload = toInventoryPayload({
      name: "Widget",
      sellingPrice: 100,
      bundleQuantity: undefined,
      bundlePrice: undefined,
      reorderPoint: undefined,
    });

    expect(payload.bundleQuantity).toBeUndefined();
    expect(payload.bundlePrice).toBeUndefined();
    expect(payload.reorderPoint).toBeUndefined();
  });

  it("keeps zero values that are meaningful", () => {
    const payload = toInventoryPayload({
      name: "Widget",
      quantity: 0,
      reorderPoint: 0,
      confirmedByApprentice: false,
    });

    expect(payload.quantity).toBe(0);
    expect(payload.reorderPoint).toBe(0);
    expect(payload.confirmedByApprentice).toBe(false);
  });
});