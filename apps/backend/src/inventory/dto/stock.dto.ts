import { z } from 'zod';

export const RestockDtoSchema = z
  .object({
    quantity: z.coerce.number().int().min(1).max(10_000_000),
    note: z.string().trim().max(500).optional(),
  })
  .strict();
export type RestockDto = z.infer<typeof RestockDtoSchema>;

/** A correction: plus or minus, with the reason always given. */
export const AdjustStockDtoSchema = z
  .object({
    delta: z.coerce
      .number()
      .int()
      .min(-10_000_000)
      .max(10_000_000)
      .refine((d) => d !== 0, 'The change cannot be 0'),
    reason: z.string().trim().min(1, 'A reason is required').max(500),
  })
  .strict();
export type AdjustStockDto = z.infer<typeof AdjustStockDtoSchema>;

export const StockHistoryQuerySchema = z
  .object({ limit: z.coerce.number().int().min(1).max(200).default(50) })
  .strict();
export type StockHistoryQuery = z.infer<typeof StockHistoryQuerySchema>;
