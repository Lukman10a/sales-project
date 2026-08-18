import { z } from 'zod';

export const RefundSaleDtoSchema = z
  .object({
    refundAmount: z.coerce.number().min(0).optional(),
    refundReason: z.string().max(500).optional(),
  })
  .strict();

export type RefundSaleDto = z.infer<typeof RefundSaleDtoSchema>;
