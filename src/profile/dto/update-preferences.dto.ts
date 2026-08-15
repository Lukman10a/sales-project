import { z } from 'zod';

const NotificationPreferencesSchema = z
  .object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    lowStock: z.boolean().optional(),
    newSales: z.boolean().optional(),
    reports: z.boolean().optional(),
    teamActivity: z.boolean().optional(),
    aiInsights: z.boolean().optional(),
  })
  .strict();

const AppearanceSettingsSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().optional(),
    currency: z.string().optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    compactMode: z.boolean().optional(),
  })
  .strict();

export const UpdatePreferencesDtoSchema = z
  .object({
    notificationPreferences: NotificationPreferencesSchema.optional(),
    appearanceSettings: AppearanceSettingsSchema.optional(),
  })
  .strict();

export type UpdatePreferencesDto = z.infer<typeof UpdatePreferencesDtoSchema>;
