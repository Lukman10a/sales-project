import { z } from 'zod';
import { AUDIT_ACTIONS } from '../../entities/audit-event.entity';

export const QueryAuditDtoSchema = z
  .object({
    actor: z.string().uuid().optional(),
    action: z.enum(AUDIT_ACTIONS).optional(),
    entityType: z.string().min(1).max(50).optional(),
    entityId: z.string().min(1).max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type QueryAuditDto = z.infer<typeof QueryAuditDtoSchema>;
