import { z } from 'zod';

export const CreateSaleItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.coerce.number().int().min(1),
    price: z.coerce.number().min(0),
  })
  .strict();

export const CreateSaleDtoSchema = z
  .object({
    items: z.array(CreateSaleItemSchema).min(1),
    paymentMethod: z
      .enum(['cash', 'card', 'transfer', 'split', 'account'])
      .default('cash'),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    customerId: z.string().uuid().optional(),
    customerName: z.string().max(200).optional(),
    saleDate: z.coerce.date().optional(),
  })
  .strict();

export type CreateSaleDto = z.infer<typeof CreateSaleDtoSchema>;
