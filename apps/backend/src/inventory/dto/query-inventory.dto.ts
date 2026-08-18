import { z } from 'zod';

export const QueryInventoryDtoSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(200).optional(),
    category: z.string().max(200).optional(),
    status: z.enum(['in-stock', 'low-stock', 'out-of-stock']).optional(),
    sort: z
      .enum(['name', 'price-asc', 'price-desc', 'quantity', 'sold'])
      .optional(),
  })
  .strict();

export type QueryInventoryDto = z.infer<typeof QueryInventoryDtoSchema>;
