import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2027-03-31');

export const CreateInventoryDtoSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    category: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    sku: z.string().max(100).optional(),
    barcode: z.string().trim().max(100).optional(),
    description: z.string().max(1000).optional(),
    costPrice: z.coerce.number().min(0).default(0),
    sellingPrice: z.coerce.number().min(0),
    /** Opening stock, recorded as the first movement. */
    quantity: z.coerce.number().int().min(0).max(10_000_000).default(0),
    reorderPoint: z.coerce.number().int().min(0).optional(),
    supplier: z.string().max(200).optional(),
    cartonSize: z.coerce.number().int().min(1).optional(),
    cartonPrice: z.coerce.number().min(0).optional(),
    expiryDate: isoDate.nullable().optional(),
    image: z.string().optional(),
  })
  .strict();

export type CreateInventoryDto = z.infer<typeof CreateInventoryDtoSchema>;
