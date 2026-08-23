import { z } from 'zod';

export const QueryInsightsDtoSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
    type: z
      .enum(['restock', 'trending', 'warning', 'pricing', 'opportunity'])
      .optional(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
  })
  .strict();

export type QueryInsightsDto = z.infer<typeof QueryInsightsDtoSchema>;
