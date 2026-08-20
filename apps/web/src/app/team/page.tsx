"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Activity } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { TeamMember, TeamRole, Permission } from "@/types/teamTypes";
import { rolePermissions } from "@/data/team";
import {
  useTeamData,
  TeamUpdateData,
  InviteResult,
} from "@/contexts/TeamDataContext";
import TeamFilters from "@/components/team/TeamFilters";
import StatsGrid from "@/components/team/StatsGrid";
const TeamMembersGrid = dynamic(
  () => import("@/components/team/TeamMembersGrid"),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card rounded-xl border shadow-sm p-4 animate-pulse"
          >
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="mt-3 h-3 bg-muted/70 rounded w-3/4" />
          </div>
        ))}
      </div>
    ),
  },
);
const ActivityLog = dynamic(() => import("@/components/team/ActivityLog"), {
  ssr: false,
  loading: () => (
    <div className="bg-card rounded-xl border shadow-sm p-4 animate-pulse">
      <div className="h-4 bg-muted rounded w-1/3" />
      <div className="mt-3 h-3 bg-muted/70 rounded w-2/3" />
    </div>
  ),
});
const AddMemberDialog = dynamic(
  () => import("@/components/team/AddMemberDialog"),
  { ssr: false, loading: () => null },
);
const EditMemberDialog = dynamic(
  () => import("@/components/team/EditMemberDialog"),
  { ssr: false, loading: () => null },
);
const DeleteMemberDialog = dynamic(
  () => import("@/components/team/DeleteMemberDialog"),
  { ssr: false, loading: () => null },
);

const emptyNewMember: Omit<TeamMember, "id" | "joinedDate"> = {
  name: "",
  email: "",
  phone: "",
  role: "sales-assistant",
  status: "invited",
  permissions: [],
  department: "",
  avatar: "",
};

export default function TeamManagement() {
  const { t } = useLanguage();
  const { hasPermission, isOwner } = usePermissions();
  const { teamMembers, inviteMember, updateMember, updatePermissions, removeMember } =
    useTeamData();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [newMember, setNewMember] =
    useState<Omit<TeamMember, "id" | "joinedDate">>(emptyNewMember);
  const [invitedCredentials, setInvitedCredentials] =
    useState<InviteResult | null>(null);
  // The one-time password must only be shown while the invite dialog is open;
  // if the owner closes it while the invite is in flight, drop the result.
  const isAddOpenRef = useRef(isAddOpen);
  useEffect(() => {
    isAddOpenRef.current = isAddOpen;
  }, [isAddOpen]);

  const filteredMembers = useMemo(() => {
    let members = teamMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (filterStatus !== "all")
      members = members.filter((m) => m.status === filterStatus);
    if (filterRole !== "all")
      members = members.filter((m) => m.role === filterRole);

    return members;
  }, [teamMembers, searchQuery, filterStatus, filterRole]);

  const stats = {
    total: teamMembers.length,
    active: teamMembers.filter((m) => m.status === "active").length,
    invited: teamMembers.filter((m) => m.status === "invited").length,
    inactive: teamMembers.filter((m) => m.status === "inactive").length,
  };

  // Permission guard: Check if user has permission to manage team/assign roles
  if (!isOwner() && !hasPermission("assign-roles")) {
    return (
      <AccessDenied
        message="You don't have permission to manage team members and assign roles"
        requiredPermission="assign-roles"
      />
    );
  }

  const handleAddMember = async () => {
    if (!newMember.name.trim() || !newMember.email.trim()) {
      toast(t("Please fill in all required fields"));
      return;
    }

    try {
      const result = await inviteMember({
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        permissions:
          newMember.permissions.length > 0
            ? newMember.permissions
            : rolePermissions[newMember.role],
        department: newMember.department || undefined,
      });
      if (isAddOpenRef.current) setInvitedCredentials(result);
    } catch {
      toast(t("Failed to invite team member. Please try again."));
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
  };

  const handleSaveEdit = () => {
    if (!editingMember) return;

    const updates: TeamUpdateData = {
      status: editingMember.status,
      department: editingMember.department || null,
    };
    if (editingMember.role !== "owner") {
      updates.role = editingMember.role;
    }
    updateMember(editingMember.id, updates);
    updatePermissions(editingMember.id, editingMember.permissions);
    setEditingMember(null);
    toast(t("Team member updated successfully"));
  };

  const handleDeleteMember = () => {
    if (!deleteTarget) return;

    removeMember(deleteTarget.id);
    toast(t("Team member removed successfully"));
    setDeleteTarget(null);
  };

  const handleRoleChange = (role: TeamRole, isEditing: boolean = false) => {
    const defaultPermissions = rolePermissions[role];
    if (isEditing && editingMember) {
      setEditingMember({
        ...editingMember,
        role,
        permissions: defaultPermissions,
      });
    } else {
      setNewMember({ ...newMember, role, permissions: defaultPermissions });
    }
  };

  const togglePermission = (
    permission: Permission,
    isEditing: boolean = false,
  ) => {
    if (isEditing && editingMember) {
      const hasPermission = editingMember.permissions.includes(permission);
      const newPermissions = hasPermission
        ? editingMember.permissions.filter((p) => p !== permission)
        : [...editingMember.permissions, permission];
      setEditingMember({ ...editingMember, permissions: newPermissions });
    } else {
      const hasPermission = newMember.permissions.includes(permission);
      const newPermissions = hasPermission
        ? newMember.permissions.filter((p) => p !== permission)
        : [...newMember.permissions, permission];
      setNewMember({ ...newMember, permissions: newPermissions });
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              {t("Team Management")}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t("Manage your team members and their permissions")}
            </p>
          </div>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("Invite Team Member")}
          </Button>
        </div>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="members" className="gap-2">
              <Users className="w-4 h-4" />
              {t("Team Members")}
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="w-4 h-4" />
              {t("Activity Log")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            {/* Filters */}
            <TeamFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterStatus={filterStatus}
              onStatusChange={setFilterStatus}
              filterRole={filterRole}
              onRoleChange={setFilterRole}
            />

            {/* Stats */}
            <StatsGrid stats={stats} />

            {/* Team Members List */}
            <TeamMembersGrid
              members={filteredMembers}
              onEdit={handleEditMember}
              onDelete={setDeleteTarget}
            />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ActivityLog />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Member Dialog */}
      <AddMemberDialog
        isOpen={isAddOpen}
        newMember={newMember}
        onMemberChange={setNewMember}
        onRoleChange={(role) => handleRoleChange(role, false)}
        onPermissionToggle={(perm) => togglePermission(perm, false)}
        onAdd={handleAddMember}
        onClose={() => {
          setIsAddOpen(false);
          setNewMember(emptyNewMember);
          setInvitedCredentials(null);
        }}
        invitedCredentials={invitedCredentials}
      />

      {/* Edit Member Dialog */}
      <EditMemberDialog
        isOpen={!!editingMember}
        editingMember={editingMember}
        onMemberChange={setEditingMember}
        onRoleChange={(role) => handleRoleChange(role, true)}
        onPermissionToggle={(perm) => togglePermission(perm, true)}
        onSave={handleSaveEdit}
        onClose={() => setEditingMember(null)}
      />

      {/* Delete Confirmation */}
      <DeleteMemberDialog
        isOpen={!!deleteTarget}
        deleteTarget={deleteTarget}
        onConfirm={handleDeleteMember}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
