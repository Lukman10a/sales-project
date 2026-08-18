import { z } from 'zod';

export const QueryNotificationsDtoSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    type: z.enum(['inventory', 'sale', 'alert', 'ai', 'system']).optional(),
    read: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  .strict();

export type QueryNotificationsDto = z.infer<typeof QueryNotificationsDtoSchema>;
