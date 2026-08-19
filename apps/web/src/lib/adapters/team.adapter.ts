import type { TeamMember } from "@/types/teamTypes";

export interface BackendTeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: TeamMember["role"];
  status: TeamMember["status"];
  permissions: TeamMember["permissions"];
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
    role: member.role,
    status: member.status,
    permissions: member.permissions,
    department: member.department ?? undefined,
    joinedDate: new Date(member.joinedDate).toISOString(),
    lastActive: undefined,
    invitedBy: undefined,
  };
}
