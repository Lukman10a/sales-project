import { z } from 'zod';

export const UpdateInventoryDtoSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    category: z.array(z.string().min(1)).min(1).optional(),
    sku: z.string().max(100).optional(),
    barcode: z.string().max(100).optional(),
    description: z.string().max(1000).optional(),
    wholesalePrice: z.coerce.number().min(0).optional(),
    sellingPrice: z.coerce.number().min(0).optional(),
    quantity: z.coerce.number().int().min(0).optional(),
    reorderPoint: z.coerce.number().int().min(0).nullable().optional(),
    supplier: z.string().max(200).optional(),
    bundleQuantity: z.coerce.number().int().min(1).nullable().optional(),
    bundlePrice: z.coerce.number().min(0).nullable().optional(),
    image: z.string().optional(),
    lastRestocked: z.coerce.date().optional(),
    confirmedByApprentice: z.boolean().optional(),
  })
  .strict();

export type UpdateInventoryDto = z.infer<typeof UpdateInventoryDtoSchema>;
