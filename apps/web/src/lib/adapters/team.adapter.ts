import type { TeamMember } from "@/types/teamTypes";
import {
  fromBackendPermissions,
  fromBackendTeamRole,
} from "@/lib/api/access-compat";

export interface BackendTeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  /** Backend team role: manager or cashier. */
  role: string;
  status: TeamMember["status"];
  /** Canonical backend permission names. */
  permissions: string[];
  maxDiscountPercent?: number;
  department?: string | null;
  joinedDate: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export function toTeamMember(member: BackendTeamMember): TeamMember {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    role: fromBackendTeamRole(member.role),
    status: member.status,
    permissions: fromBackendPermissions(member.permissions),
    department: member.department ?? undefined,
    joinedDate: new Date(member.joinedDate).toISOString(),
    lastActive: undefined,
    invitedBy: undefined,
  };
}
