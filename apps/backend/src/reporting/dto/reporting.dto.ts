import { z } from 'zod';
import { isoDay } from '../../common/dto/iso-day';
import { REPORT_PERIODS } from '../periods';

/** Longest custom range a report accepts. */
export const MAX_RANGE_DAYS = 366;

const spanDays = (from: string, to: string) =>
  (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;

const range = z
  .object({ from: isoDay, to: isoDay })
  .strict()
  .refine((q) => q.from <= q.to, {
    message: '`from` must be on or before `to`',
    path: ['from'],
  })
  .refine((q) => spanDays(q.from, q.to) <= MAX_RANGE_DAYS, {
    message: `At most ${MAX_RANGE_DAYS} days`,
    path: ['to'],
  });

const period = z.enum(REPORT_PERIODS).default('today');

export const SummaryQuerySchema = z.object({ period }).strict();
export type SummaryQuery = z.infer<typeof SummaryQuerySchema>;

export const RevenueSeriesQuerySchema = z
  .object({
    from: isoDay,
    to: isoDay,
    compare: z.enum(['previous', 'none']).default('none'),
  })
  .strict()
  .refine((q) => q.from <= q.to, {
    message: '`from` must be on or before `to`',
    path: ['from'],
  })
  .refine((q) => spanDays(q.from, q.to) <= MAX_RANGE_DAYS, {
    message: `At most ${MAX_RANGE_DAYS} days`,
    path: ['to'],
  });
export type RevenueSeriesQuery = z.infer<typeof RevenueSeriesQuerySchema>;

export const TopProductsQuerySchema = z
  .object({
    period: period.default('7d'),
    by: z.enum(['units', 'revenue']).default('revenue'),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();
export type TopProductsQuery = z.infer<typeof TopProductsQuerySchema>;

export const PaymentMethodsQuerySchema = z
  .object({ period: period.default('7d') })
  .strict();
export type PaymentMethodsQuery = z.infer<typeof PaymentMethodsQuerySchema>;

export const PnlQuerySchema = range;
export type PnlQuery = z.infer<typeof PnlQuerySchema>;
