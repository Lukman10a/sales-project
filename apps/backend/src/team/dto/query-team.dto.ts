import { z } from 'zod';
import { TEAM_ROLES } from '../team.constants';

export const QueryTeamDtoSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    role: z.enum(TEAM_ROLES).optional(),
    status: z.enum(['active', 'inactive', 'invited']).optional(),
  })
  .strict();

export type QueryTeamDto = z.infer<typeof QueryTeamDtoSchema>;
