import { z } from 'zod';

/** Business-wide sale settings. */
export const UpdateSalesSettingsDtoSchema = z
  .object({ vatEnabled: z.boolean() })
  .strict();

export type UpdateSalesSettingsDto = z.infer<
  typeof UpdateSalesSettingsDtoSchema
>;
