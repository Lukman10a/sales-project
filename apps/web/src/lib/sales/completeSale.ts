import type { SaleRecord } from "@/types/salesTypes";

export interface SubmitSaleParams {
  record: SaleRecord;
  recordSale: (sale: SaleRecord) => Promise<void>;
  onSubmitted: (record: SaleRecord) => void;
}

/**
 * Record a completed sale exactly once. Deliberately has NO inventory
 * side-effect: the backend sale transaction decrements stock atomically
 * (`POST /sales`), so the client must never also call
 * `POST /inventory/:id/decrement` alongside it.
 *
 * `onSubmitted` runs only after the sale persisted, so callers must not show a
 * success toast or clear the cart until this resolves.
 */
export async function submitSale(params: SubmitSaleParams): Promise<void> {
  await params.recordSale(params.record);
  params.onSubmitted(params.record);
}