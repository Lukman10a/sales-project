import { z } from 'zod';

export const DecrementInventoryDtoSchema = z
  .object({
    quantity: z.coerce.number().int().min(1),
  })
  .strict();

export type DecrementInventoryDto = z.infer<typeof DecrementInventoryDtoSchema>;
