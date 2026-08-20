import type { SaleRecord } from "@/types/salesTypes";

export interface RefundRouteInput {
  saleId: string;
  refundAmount: number;
  reason: string;
  recentSales: SaleRecord[];
  refundSale: (
    saleId: string,
    refundAmount: number,
    reason: string,
  ) => Promise<void>;
}

/**
 * Route a refund request. Refunds are a mutation of an existing sale and must
 * go to `refundSale` (PATCH /sales/:id/refund). `addSaleRecord` (POST /sales)
 * is deliberately not in this seam, so a refund can never be routed to a
 * brand-new sale record.
 */
export async function routeRefund(input: RefundRouteInput): Promise<boolean> {
  const { saleId, refundAmount, reason, recentSales } = input;
  const originalSale = recentSales.find((s) => s.id === saleId);
  if (!originalSale) return false;

  await input.refundSale(saleId, refundAmount, reason);
  return true;
}