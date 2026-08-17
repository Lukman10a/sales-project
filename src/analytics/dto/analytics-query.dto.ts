import { z } from 'zod';

export const AnalyticsQueryDtoSchema = z
  .object({
    period: z.enum(['today', 'week', 'month']).default('week'),
  })
  .strict();

export type AnalyticsQueryDto = z.infer<typeof AnalyticsQueryDtoSchema>;
