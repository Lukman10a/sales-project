import { describe, it, expect, vi } from "vitest";
import { routeRefund } from "./refund";
import type { SaleRecord } from "@/types/salesTypes";

const completedSale: SaleRecord = {
  id: "s1",
  items: [{ name: "Phone", quantity: 1, price: 100 }],
  total: 100,
  soldBy: "Jane",
  time: "10:00",
  status: "completed",
};

describe("routeRefund", () => {
  it("routes a valid refund to refundSale (PATCH), not a new sale", async () => {
    const refundSale = vi.fn().mockResolvedValue(undefined);

    const result = await routeRefund({
      saleId: "s1",
      refundAmount: 50,
      reason: "Damaged item",
      recentSales: [completedSale],
      refundSale,
    });

    expect(result).toBe(true);
    expect(refundSale).toHaveBeenCalledWith("s1", 50, "Damaged item");
  });

  it("returns false without calling anything when the sale is not found", async () => {
    const refundSale = vi.fn();

    const result = await routeRefund({
      saleId: "missing",
      refundAmount: 50,
      reason: "Damaged item",
      recentSales: [completedSale],
      refundSale,
    });

    expect(result).toBe(false);
    expect(refundSale).not.toHaveBeenCalled();
  });
});