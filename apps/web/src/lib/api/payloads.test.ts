import { describe, it, expect } from "vitest";
import {
  toInventoryPayload,
  toSalePayload,
  toTeamPermissions,
} from "./payloads";
import type { InventoryItem } from "@/types/inventoryTypes";
import type { SaleRecord } from "@/types/salesTypes";

describe("toTeamPermissions", () => {
  it("keeps backend-valid permission names", () => {
    expect(
      toTeamPermissions([
        "view-products",
        "record-sales",
        "assign-roles",
        "view-reports",
      ]),
    ).toEqual(["view-products", "record-sales", "assign-roles", "view-reports"]);
  });

  it("strips the deprecated checkout-sales alias", () => {
    expect(toTeamPermissions(["view-products", "checkout-sales"])).toEqual([
      "view-products",
    ]);
  });

  it("strips the deprecated view-out-of-stock alias", () => {
    expect(toTeamPermissions(["view-inventory", "view-out-of-stock"])).toEqual([
      "view-inventory",
    ]);
  });

  it("returns an empty array when only aliases are sent", () => {
    expect(toTeamPermissions(["checkout-sales", "view-out-of-stock"])).toEqual(
      [],
    );
  });
});

describe("toSalePayload", () => {
  const sale: SaleRecord = {
    id: "s1",
    items: [
      { name: "Widget", quantity: 2, price: 50 },
      { name: "Gadget", quantity: 1, price: 30 },
    ],
    total: 117,
    soldBy: "u1",
    time: "now",
    status: "completed",
    paymentMethod: "cash",
    discount: 10,
  };

  it("maps items to productId/quantity/price when productId is present", () => {
    const payload = toSalePayload({
      ...sale,
      items: [
        { name: "Widget", productId: "p1", quantity: 2, price: 50 },
        { name: "Gadget", productId: "p2", quantity: 1, price: 30 },
      ],
    });

    expect(payload.items).toEqual([
      { productId: "p1", quantity: 2, price: 50 },
      { productId: "p2", quantity: 1, price: 30 },
    ]);
  });

  it("maps discount to discountPercent", () => {
    expect(toSalePayload(sale).discountPercent).toBe(10);
  });

  it("passes customerId, customerName, saleDate and paymentMethod", () => {
    const payload = toSalePayload({
      ...sale,
      customerId: "c1",
      customerName: "Ada",
      saleDate: "2026-08-01",
    });

    expect(payload.customerId).toBe("c1");
    expect(payload.customerName).toBe("Ada");
    expect(payload.saleDate).toBe("2026-08-01");
    expect(payload.paymentMethod).toBe("cash");
  });

  it("passes splitPayments, loyaltyPointsUsed and accountCredit when present", () => {
    const payload = toSalePayload({
      ...sale,
      splitPayments: [
        { method: "cash", amount: 60 },
        { method: "card", amount: 57 },
      ],
      loyaltyPointsUsed: 5,
      accountCredit: 10,
    });

    expect(payload.splitPayments).toEqual([
      { method: "cash", amount: 60 },
      { method: "card", amount: 57 },
    ]);
    expect(payload.loyaltyPointsUsed).toBe(5);
    expect(payload.accountCredit).toBe(10);
  });

  it("omits optional fields when not present", () => {
    const payload = toSalePayload(sale);

    expect(payload.customerId).toBeUndefined();
    expect(payload.customerName).toBeUndefined();
    expect(payload.saleDate).toBeUndefined();
    expect(payload.splitPayments).toBeUndefined();
    expect(payload.loyaltyPointsUsed).toBeUndefined();
    expect(payload.accountCredit).toBeUndefined();
  });
});


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