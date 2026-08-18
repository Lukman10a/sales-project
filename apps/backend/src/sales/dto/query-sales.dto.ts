import { z } from 'zod';

export const QuerySalesDtoSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    paymentMethod: z
      .enum(['cash', 'card', 'transfer', 'split', 'account'])
      .optional(),
    status: z
      .enum(['completed', 'pending', 'refunded', 'partial-refund'])
      .optional(),
  })
  .strict();

export type QuerySalesDto = z.infer<typeof QuerySalesDtoSchema>;
