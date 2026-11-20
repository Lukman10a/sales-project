import { z } from 'zod';
import { CreateSaleItemSchema } from './create-sale.dto';

/** A parked cart. Like a sale, it carries no prices. */
export const CreateHeldTransactionDtoSchema = z
  .object({
    customerName: z.string().min(1).max(200),
    items: z.array(CreateSaleItemSchema).min(1).max(200),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    paymentMethod: z
      .enum(['cash', 'card', 'transfer', 'split', 'account'])
      .default('cash'),
  })
  .strict();

export type CreateHeldTransactionDto = z.infer<
  typeof CreateHeldTransactionDtoSchema
>;
