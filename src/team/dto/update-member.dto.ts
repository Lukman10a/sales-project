import { z } from 'zod';
import { TEAM_ROLES } from '../team.constants';

export const UpdateMemberDtoSchema = z
  .object({
    role: z.enum(TEAM_ROLES).optional(),
    status: z.enum(['active', 'inactive', 'invited']).optional(),
    department: z.string().max(100).nullable().optional(),
  })
  .strict();

export type UpdateMemberDto = z.infer<typeof UpdateMemberDtoSchema>;
