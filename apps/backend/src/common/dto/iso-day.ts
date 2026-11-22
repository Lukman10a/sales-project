import { z } from 'zod';

/** A real calendar day written YYYY-MM-DD. */
export const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2027-03-31')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, 'Not a real date');
