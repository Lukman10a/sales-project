"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { StaffMember } from "./settingsConfig";
import { useTeamData } from "@/contexts/TeamDataContext";
import type { TeamMember } from "@/types/teamTypes";

interface StaffManagementProps {
  staff?: StaffMember[] | TeamMember[];
  onAddStaff?: (name: string, email: string) => void;
  onRemoveMember?: (id: string) => void;
}

export default function StaffManagement({
  staff,
  onAddStaff,
  onRemoveMember,
}: StaffManagementProps) {
  const { t } = useLanguage();
  const { teamMembers, inviteMember, removeMember } = useTeamData();
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");

  const displayMembers: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
  }> =
    staff && staff.length > 0
      ? (staff as Array<{ id: string; name: string; email: string; status: string }>)
      : (teamMembers as unknown as Array<{
          id: string;
          name: string;
          email: string;
          status: string;
        }>);

  const handleSendInvitation = () => {
    if (!newStaffName || !newStaffEmail) return;
    if (onAddStaff) {
      onAddStaff(newStaffName, newStaffEmail);
    } else {
      inviteMember({
        name: newStaffName,
        email: newStaffEmail,
        role: "inventory" as unknown as import("@/types/teamTypes").TeamRole,
        permissions: [],
      }).catch(() => {});
    }
    setNewStaffName("");
    setNewStaffEmail("");
  };

  const handleRemove = (id: string) => {
    if (onRemoveMember) {
      onRemoveMember(id);
    } else {
      removeMember(id);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-xl text-foreground mb-1">
          {t("Staff & Invitations")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("Invite and manage your staff")}
        </p>
      </div>
      <Separator />
      <div className="space-y-4">
        {displayMembers.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div>
              <p className="font-medium">{member.name}</p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={member.status === "active" ? "default" : "secondary"}
              >
                {member.status}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemove(member.id)}
              >
                {t("Remove")}
              </Button>
            </div>
          </div>
        ))}
        <Separator />
        <div className="space-y-3">
          <Input
            placeholder={t("Staff Name")}
            value={newStaffName}
            onChange={(e) => setNewStaffName(e.target.value)}
          />
          <Input
            placeholder={t("Staff Email")}
            type="email"
            value={newStaffEmail}
            onChange={(e) => setNewStaffEmail(e.target.value)}
          />
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSendInvitation}
          >
            {t("Send Invitation")}
          </Button>
        </div>
      </div>
    </div>
  );
}



