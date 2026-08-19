import { z } from 'zod';

export const CreateInventoryDtoSchema = z
  .object({
    name: z.string().min(1).max(200),
    category: z.array(z.string().min(1)).min(1).optional(),
    sku: z.string().max(100).optional(),
    barcode: z.string().max(100).optional(),
    description: z.string().max(1000).optional(),
    wholesalePrice: z.coerce.number().min(0).default(0),
    sellingPrice: z.coerce.number().min(0),
    quantity: z.coerce.number().int().min(0).default(0),
    reorderPoint: z.coerce.number().int().min(0).optional(),
    supplier: z.string().max(200).optional(),
    bundleQuantity: z.coerce.number().int().min(1).optional(),
    bundlePrice: z.coerce.number().min(0).optional(),
    image: z.string().optional(),
    lastRestocked: z.coerce.date().optional(),
    confirmedByApprentice: z.boolean().optional(),
  })
  .strict();

export type CreateInventoryDto = z.infer<typeof CreateInventoryDtoSchema>;
