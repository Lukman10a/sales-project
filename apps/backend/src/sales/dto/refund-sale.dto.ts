import { z } from 'zod';

/**
 * A reason is always required. Without `items` the rest of the sale is
 * refunded; with them, each line gives back only the quantity named.
 */
export const RefundSaleDtoSchema = z
  .object({
    refundReason: z
      .string()
      .trim()
      .min(1, 'A refund reason is required')
      .max(500),
    items: z
      .array(
        z
          .object({
            saleItemId: z.string().uuid(),
            quantity: z.coerce.number().int().min(1),
          })
          .strict(),
      )
      .min(1)
      .optional(),
  })
  .strict();

export type RefundSaleDto = z.infer<typeof RefundSaleDtoSchema>;
