import type { ActivityLog } from "@/types/teamTypes";

export interface BackendActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId?: string;
  timestamp: string;
  details?: string;
}

export function toActivityLog(entry: BackendActivityLog): ActivityLog {
  return {
    id: entry.id,
    userId: entry.userId,
    userName: entry.userName,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    timestamp: new Date(entry.timestamp).toISOString(),
    details: entry.details,
  };
}
