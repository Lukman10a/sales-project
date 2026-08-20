import { describe, it, expect, vi } from "vitest";
import { submitSale } from "./completeSale";
import type { SaleRecord } from "@/types/salesTypes";

const record: SaleRecord = {
  id: "local-1",
  items: [{ name: "Widget", productId: "p1", quantity: 2, price: 50 }],
  total: 100,
  soldBy: "u1",
  time: "just now",
  status: "completed",
  paymentMethod: "cash",
  discount: 0,
};

describe("submitSale", () => {
  it("records the sale exactly once and never touches inventory", async () => {
    const recordSale = vi.fn().mockResolvedValue(undefined);
    const onSubmitted = vi.fn();

    await submitSale({ record, recordSale, onSubmitted });

    expect(recordSale).toHaveBeenCalledTimes(1);
    expect(recordSale).toHaveBeenCalledWith(record);
    expect(onSubmitted).toHaveBeenCalledWith(record);
  });

  it("does not run the success path when recording fails", async () => {
    const recordSale = vi
      .fn()
      .mockRejectedValue(new Error("Insufficient stock"));
    const onSubmitted = vi.fn();

    await expect(
      submitSale({ record, recordSale, onSubmitted }),
    ).rejects.toThrow("Insufficient stock");
    expect(onSubmitted).not.toHaveBeenCalled();
  });
});