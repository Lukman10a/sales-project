import { z } from 'zod';

export const CreateHeldTransactionItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.coerce.number().int().min(1),
    price: z.coerce.number().min(0),
  })
  .strict();

export const CreateHeldTransactionDtoSchema = z
  .object({
    customerName: z.string().min(1).max(200),
    items: z.array(CreateHeldTransactionItemSchema).min(1),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    paymentMethod: z
      .enum(['cash', 'card', 'transfer', 'split', 'account'])
      .default('cash'),
  })
  .strict();

export type CreateHeldTransactionDto = z.infer<
  typeof CreateHeldTransactionDtoSchema
>;
