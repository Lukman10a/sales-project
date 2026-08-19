import { describe, it, expect } from "vitest";
import { toSaleRecord } from "./sale.adapter";
import type { BackendSale, BackendSaleItem } from "./sale.adapter";

function backendItem(overrides: Partial<BackendSaleItem> = {}): BackendSaleItem {
  return {
    id: "item1",
    productId: "p1",
    productName: "Widget",
    quantity: 2,
    price: "50.00",
    total: "100.00",
    ...overrides,
  };
}

function backendSale(overrides: Partial<BackendSale> = {}): BackendSale {
  return {
    id: "s1",
    total: "150.00",
    paymentMethod: "cash",
    status: "completed",
    saleDate: "2026-08-01",
    soldBy: "u1",
    discountPercent: "10.00",
    createdAt: "2026-08-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("sale adapter", () => {
  it("maps time and saleTimestamp from createdAt", () => {
    const sale = toSaleRecord(backendSale());

    expect(sale.time).toBe("2026-08-01T12:00:00.000Z");
    expect(sale.saleTimestamp).toBe(new Date("2026-08-01T12:00:00.000Z").getTime());
  });

  it("maps discountPercent to discount and coerces decimal strings", () => {
    const sale = toSaleRecord(backendSale());

    expect(sale.discount).toBe(10);
    expect(sale.total).toBe(150);
  });

  it("maps a list row (no items) to items: [] with the real itemCount", () => {
    const sale = toSaleRecord(backendSale({ itemCount: 3, items: undefined }));

    expect(sale.items).toEqual([]);
    expect(sale.itemCount).toBe(3);
  });

  it("maps a detail row items with name from productName", () => {
    const sale = toSaleRecord(
      backendSale({ itemCount: 1, items: [backendItem()] }),
    );

    expect(sale.items).toEqual([{ name: "Widget", quantity: 2, price: 50 }]);
    expect(sale.itemCount).toBe(1);
  });

  it("maps items with numeric price when decimals are provided as numbers", () => {
    const sale = toSaleRecord(
      backendSale({
        itemCount: 1,
        items: [backendItem({ price: 50, total: 100 })],
      }),
    );

    expect(sale.items).toEqual([{ name: "Widget", quantity: 2, price: 50 }]);
  });

  it("passes through paymentMethod, status, soldBy, customer and refund fields", () => {
    const sale = toSaleRecord(
      backendSale({
        paymentMethod: "split",
        status: "refunded",
        soldBy: "manager1",
        customerId: "c1",
        customerName: "Ada",
        refundAmount: "50.00",
        refundReason: "damaged",
        saleDate: "2026-08-02",
      }),
    );

    expect(sale.paymentMethod).toBe("split");
    expect(sale.status).toBe("refunded");
    expect(sale.soldBy).toBe("manager1");
    expect(sale.customerId).toBe("c1");
    expect(sale.customerName).toBe("Ada");
    expect(sale.refundAmount).toBe(50);
    expect(sale.refundReason).toBe("damaged");
    expect(sale.saleDate).toBe("2026-08-02");
  });
});