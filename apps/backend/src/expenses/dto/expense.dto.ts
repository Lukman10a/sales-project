import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../../entities/expense.entity';

/** A real calendar day written YYYY-MM-DD. */
export const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2027-03-31')
  .refine(
    (s) => new Date(`${s}T00:00:00Z`).toISOString().startsWith(s),
    'Not a real date',
  );

const amount = z.coerce
  .number()
  .positive('The amount must be more than 0')
  .max(10_000_000_000)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6,
    'At most two decimal places (kobo)',
  );

export const CreateExpenseDtoSchema = z
  .object({
    category: z.enum(EXPENSE_CATEGORIES),
    amount,
    /** Defaults to today in the business timezone. */
    date: isoDay.optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();
export type CreateExpenseDto = z.infer<typeof CreateExpenseDtoSchema>;

export const UpdateExpenseDtoSchema = z
  .object({
    category: z.enum(EXPENSE_CATEGORIES).optional(),
    amount: amount.optional(),
    date: isoDay.optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, 'Nothing to change');
export type UpdateExpenseDto = z.infer<typeof UpdateExpenseDtoSchema>;

export const QueryExpensesDtoSchema = z
  .object({
    from: isoDay.optional(),
    to: isoDay.optional(),
    category: z.enum(EXPENSE_CATEGORIES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '`from` must be on or before `to`',
    path: ['from'],
  });
export type QueryExpensesDto = z.infer<typeof QueryExpensesDtoSchema>;

export const ExpenseSummaryQuerySchema = z
  .object({
    from: isoDay,
    to: isoDay,
    groupBy: z.enum(['day', 'month']).default('month'),
  })
  .strict()
  .refine((q) => q.from <= q.to, {
    message: '`from` must be on or before `to`',
    path: ['from'],
  });
export type ExpenseSummaryQuery = z.infer<typeof ExpenseSummaryQuerySchema>;
