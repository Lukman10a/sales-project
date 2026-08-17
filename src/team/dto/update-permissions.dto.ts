import { z } from 'zod';
import { TEAM_PERMISSIONS } from '../team.constants';

export const UpdatePermissionsDtoSchema = z
  .object({
    permissions: z.array(z.enum(TEAM_PERMISSIONS)),
  })
  .strict();

export type UpdatePermissionsDto = z.infer<typeof UpdatePermissionsDtoSchema>;
