import { z } from 'zod';
import { TEAM_PERMISSIONS, TEAM_ROLES } from '../team.constants';

export const InviteMemberDtoSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1).max(200),
    role: z.enum(TEAM_ROLES),
    permissions: z.array(z.enum(TEAM_PERMISSIONS)).optional(),
    department: z.string().max(100).optional(),
  })
  .strict();

export type InviteMemberDto = z.infer<typeof InviteMemberDtoSchema>;
