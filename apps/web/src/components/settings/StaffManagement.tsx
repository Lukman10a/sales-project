"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { StaffMember } from "./settingsConfig";

interface StaffManagementProps {
  staff: StaffMember[];
  onAddStaff?: (name: string, email: string) => void;
}

export default function StaffManagement({
  staff,
  onAddStaff,
}: StaffManagementProps) {
  const { t } = useLanguage();
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");

  const handleSendInvitation = () => {
    if (onAddStaff && newStaffName && newStaffEmail) {
      onAddStaff(newStaffName, newStaffEmail);
      setNewStaffName("");
      setNewStaffEmail("");
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
        {staff.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div>
              <p className="font-medium">{member.name}</p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
            <Badge
              variant={member.status === "active" ? "default" : "secondary"}
            >
              {member.status}
            </Badge>
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



