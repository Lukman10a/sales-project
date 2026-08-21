import { z } from 'zod';
import { REPORT_TYPES, REPORT_FORMATS } from '../../entities/report.entity';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)');

export const CreateReportDtoSchema = z
  .object({
    name: z.string().min(1).max(200),
    type: z.enum(REPORT_TYPES),
    format: z.enum(REPORT_FORMATS),
    dateRange: z
      .object({
        start: isoDate,
        end: isoDate,
      })
      .refine((range) => range.start <= range.end, {
        message: 'dateRange.start must be before or equal to dateRange.end',
      }),
    includeCategories: z.boolean().optional(),
    includeExpenses: z.boolean().optional(),
    includeStaff: z.boolean().optional(),
  })
  .strict();

export type CreateReportDto = z.infer<typeof CreateReportDtoSchema>;
