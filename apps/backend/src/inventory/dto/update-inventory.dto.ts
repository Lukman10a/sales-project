import { z } from 'zod';

/** Stock is not editable here: use restock or adjust. */
export const UpdateInventoryDtoSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    category: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    sku: z.string().max(100).optional(),
    barcode: z.string().trim().max(100).optional(),
    description: z.string().max(1000).optional(),
    costPrice: z.coerce.number().min(0).optional(),
    sellingPrice: z.coerce.number().min(0).optional(),
    reorderPoint: z.coerce.number().int().min(0).nullable().optional(),
    supplier: z.string().max(200).optional(),
    cartonSize: z.coerce.number().int().min(1).nullable().optional(),
    cartonPrice: z.coerce.number().min(0).nullable().optional(),
    expiryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2027-03-31')
      .nullable()
      .optional(),
    image: z.string().optional(),
  })
  .strict();

export type UpdateInventoryDto = z.infer<typeof UpdateInventoryDtoSchema>;
