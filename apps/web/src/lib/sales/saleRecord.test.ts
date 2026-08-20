import { describe, it, expect } from "vitest";
import { buildSaleRecord, buildHeldTransaction } from "./saleRecord";
import type { CartItem } from "@/types/salesTypes";

function cartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "inv-1",
    name: "Widget",
    image: "img.png",
    sellingPrice: 50,
    availableQty: 10,
    quantity: 2,
    actualPrice: 50,
    ...overrides,
  };
}

const params = {
  cart: [cartItem()],
  soldBy: "Ada",
  paymentMethod: "cash" as const,
  discountPercent: 0,
  splitPayments: [],
  selectedCustomer: null,
  loyaltyPointsUsed: 0,
  accountCreditUsed: 0,
  saleDate: "2026-08-01",
};

describe("buildSaleRecord", () => {
  it("carries the cart product id into each sale item", () => {
    const record = buildSaleRecord(params);

    expect(record.items).toEqual([
      { name: "Widget", productId: "inv-1", quantity: 2, price: 50 },
    ]);
  });

  it("computes the total from actual price, quantity and discount", () => {
    const record = buildSaleRecord({
      ...params,
      cart: [cartItem({ actualPrice: 40 })],
      discountPercent: 10,
    });

    expect(record.total).toBe(72);
  });

  it("lowers the total by loyalty points and account credit", () => {
    const record = buildSaleRecord({
      ...params,
      loyaltyPointsUsed: 500,
      accountCreditUsed: 10,
    });

    expect(record.total).toBe(85);
  });

  it("marks the record completed with sale date and timestamp", () => {
    const record = buildSaleRecord({ ...params, saleDate: "2026-08-01" });

    expect(record.status).toBe("completed");
    expect(record.saleDate).toBe("2026-08-01");
    expect(record.saleTimestamp).toBe(new Date("2026-08-01").getTime());
  });

  it("records split payments when paymentMethod is split", () => {
    const record = buildSaleRecord({
      ...params,
      paymentMethod: "split",
      splitPayments: [{ method: "cash", amount: 50 }],
    });

    expect(record.splitPayments).toEqual([{ method: "cash", amount: 50 }]);
  });

  it("records the customer name when a customer is selected", () => {
    const record = buildSaleRecord({
      ...params,
      selectedCustomer: { name: "Ada" },
    });

    expect(record.customerName).toBe("Ada");
  });
});

describe("buildHeldTransaction", () => {
  it("maps cart items with productId and actual price", () => {
    const held = buildHeldTransaction({
      cart: [cartItem({ quantity: 1, actualPrice: 30 })],
      customerName: "Ada",
      heldBy: "u1",
      discountPercent: 5,
      paymentMethod: "cash",
    });

    expect(held.items).toEqual([{ productId: "inv-1", quantity: 1, price: 30 }]);
    expect(held.customerName).toBe("Ada");
    expect(held.heldBy).toBe("u1");
    expect(held.discountPercent).toBe(5);
    expect(held.paymentMethod).toBe("cash");
  });
});