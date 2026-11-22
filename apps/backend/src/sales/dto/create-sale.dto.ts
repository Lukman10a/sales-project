import { z } from 'zod';
import { isoDay } from '../../common/dto/iso-day';
import { SALE_UNITS } from '../../entities/sale-item.entity';

/**
 * A line says what is sold, never at what price: the server prices it. A
 * `price` from an older or tampered client is accepted and thrown away.
 */
export const CreateSaleItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.coerce.number().int().min(1).max(100_000),
    unit: z.enum(SALE_UNITS).default('unit'),
    price: z.unknown().optional(),
  })
  .strict()
  .transform(({ productId, quantity, unit }) => ({
    productId,
    quantity,
    unit,
  }));

export const CreateSaleDtoSchema = z
  .object({
    items: z.array(CreateSaleItemSchema).min(1).max(200),
    paymentMethod: z
      .enum(['cash', 'card', 'transfer', 'split', 'account'])
      .default('cash'),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    customerId: z.string().uuid().optional(),
    customerName: z.string().max(200).optional(),
    /** A back-dated sale's Lagos business day; defaults to today. */
    saleDate: isoDay.optional(),
    splitPayments: z
      .array(
        z
          .object({
            method: z.enum(['cash', 'card', 'transfer', 'account']),
            amount: z.number().positive(),
          })
          .strict(),
      )
      .optional(),
    loyaltyPointsUsed: z.number().int().min(0).optional(),
    accountCredit: z.number().min(0).optional(),
  })
  .strict();

export type CreateSaleDto = z.infer<typeof CreateSaleDtoSchema>;
