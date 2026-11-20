import type { SaleRecord } from "@/types/salesTypes";

/** A quantity of one sale line to give back. */
export interface RefundLine {
  saleItemId: string;
  quantity: number;
}

export interface RefundRouteInput {
  saleId: string;
  reason: string;
  /** Omitted: refund everything not yet refunded. */
  items?: RefundLine[];
  recentSales: SaleRecord[];
  refundSale: (
    saleId: string,
    reason: string,
    items?: RefundLine[],
  ) => Promise<void>;
}

/**
 * Route a refund request. Refunds are a mutation of an existing sale and must
 * go to `refundSale` (PATCH /sales/:id/refund). `addSaleRecord` (POST /sales)
 * is deliberately not in this seam, so a refund can never be routed to a
 * brand-new sale record.
 */
export async function routeRefund(input: RefundRouteInput): Promise<boolean> {
  const { saleId, reason, items, recentSales } = input;
  const originalSale = recentSales.find((s) => s.id === saleId);
  if (!originalSale) return false;

  await input.refundSale(saleId, reason, items);
  return true;
}