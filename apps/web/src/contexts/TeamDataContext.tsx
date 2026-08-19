"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import {
  BackendTeamMember,
  toTeamMember,
} from "@/lib/adapters/team.adapter";
import { toTeamPermissions } from "@/lib/api/payloads";
import type { Permission, TeamMember, TeamRole, TeamStatus } from "@/types/teamTypes";

interface TeamInviteData {
  name: string;
  email: string;
  role: TeamRole;
  permissions: Permission[];
  department?: string;
}

export interface TeamUpdateData {
  role?: TeamRole;
  status?: TeamStatus;
  department?: string | null;
}

interface TeamDataContextType {
  teamMembers: TeamMember[];
  isLoading: boolean;
  isError: boolean;
  inviteMember: (member: TeamInviteData) => void;
  updateMember: (id: string, updates: TeamUpdateData) => void;
  updatePermissions: (id: string, permissions: Permission[]) => void;
  removeMember: (id: string) => void;
}

const TeamDataContext = createContext<TeamDataContextType | undefined>(
  undefined,
);

export function TeamDataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["team"] });
  }, [queryClient]);

  const teamQuery = useQuery({
    queryKey: ["team"],
    queryFn: () => api.get<ApiEnvelope<BackendTeamMember[]>>("/team"),
  });

  const teamMembers = useMemo(
    () => (teamQuery.data?.data ?? []).map(toTeamMember),
    [teamQuery.data],
  );

  const inviteMutation = useMutation({
    mutationFn: (member: TeamInviteData) =>
      api.post<{ id: string; message: string }>("/team", {
        email: member.email,
        name: member.name,
        role: member.role,
        permissions: toTeamPermissions(member.permissions),
        ...(member.department ? { department: member.department } : {}),
      }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TeamUpdateData }) =>
      api.patch<BackendTeamMember>(`/team/${id}`, updates),
    onSuccess: invalidate,
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: Permission[] }) =>
      api.patch<BackendTeamMember>(`/team/${id}/permissions`, {
        permissions: toTeamPermissions(permissions),
      }),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/team/${id}`),
    onSuccess: invalidate,
  });

  const inviteMember = useCallback(
    (member: TeamInviteData) => inviteMutation.mutate(member),
    [inviteMutation],
  );

  const updateMember = useCallback(
    (id: string, updates: TeamUpdateData) =>
      updateMutation.mutate({ id, updates }),
    [updateMutation],
  );

  const updatePermissions = useCallback(
    (id: string, permissions: Permission[]) =>
      updatePermissionsMutation.mutate({ id, permissions }),
    [updatePermissionsMutation],
  );

  const removeMember = useCallback(
    (id: string) => removeMutation.mutate(id),
    [removeMutation],
  );

  const value = useMemo(
    () => ({
      teamMembers,
      isLoading: teamQuery.isLoading,
      isError: teamQuery.isError,
      inviteMember,
      updateMember,
      updatePermissions,
      removeMember,
    }),
    [
      teamMembers,
      teamQuery.isLoading,
      teamQuery.isError,
      inviteMember,
      updateMember,
      updatePermissions,
      removeMember,
    ],
  );

  return (
    <TeamDataContext.Provider value={value}>
      {children}
    </TeamDataContext.Provider>
  );
}

export function useTeamData() {
  const context = useContext(TeamDataContext);
  if (context === undefined) {
    throw new Error("useTeamData must be used within a TeamDataProvider");
  }
  return context;
}
