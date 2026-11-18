import { z } from 'zod';
import { TEAM_PERMISSIONS } from '../team.constants';

export const UpdatePermissionsDtoSchema = z
  .object({
    permissions: z.array(z.enum(TEAM_PERMISSIONS)),
    maxDiscountPercent: z.number().int().min(0).max(100).optional(),
  })
  .strict();

export type UpdatePermissionsDto = z.infer<typeof UpdatePermissionsDtoSchema>;
