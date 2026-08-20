"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TeamMember, TeamRole, Permission } from "@/types/teamTypes";
import { rolePermissions, permissionDescriptions } from "@/data/team";
import type { InviteResult } from "@/contexts/TeamDataContext";

interface AddMemberDialogProps {
  isOpen: boolean;
  newMember: Omit<TeamMember, "id" | "joinedDate">;
  onMemberChange: (member: Omit<TeamMember, "id" | "joinedDate">) => void;
  onRoleChange: (role: TeamRole) => void;
  onPermissionToggle: (permission: Permission) => void;
  onAdd: () => void;
  onClose: () => void;
  /** Set after a successful invite to render the one-time credentials view. */
  invitedCredentials?: InviteResult | null;
}

export default function AddMemberDialog({
  isOpen,
  newMember,
  onMemberChange,
  onRoleChange,
  onPermissionToggle,
  onAdd,
  onClose,
  invitedCredentials,
}: AddMemberDialogProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopyPassword = () => {
    if (!invitedCredentials) return;
    navigator.clipboard?.writeText(invitedCredentials.temporaryPassword);
    setCopied(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {invitedCredentials ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("Invitation Created")}</DialogTitle>
              <DialogDescription>
                {t(
                  "Share this temporary password with the invited member. It will not be shown again.",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-1">
                <Label>{t("Invited member")}</Label>
                <p className="text-sm text-foreground font-medium">
                  {invitedCredentials.name} ({invitedCredentials.email})
                </p>
              </div>
              <div className="grid gap-1">
                <Label>{t("Temporary password")}</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg border bg-muted/30 px-3 py-2 text-sm font-mono">
                    {invitedCredentials.temporaryPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPassword}
                    aria-label={t("Copy temporary password")}
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={onClose}>{t("Done")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("Invite Team Member")}</DialogTitle>
              <DialogDescription>
                {t(
                  "Send an invitation to join your team with specific role and permissions",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t("Full Name")}*</Label>
                  <Input
                    id="name"
                    placeholder={t("John Doe")}
                    value={newMember.name}
                    onChange={(e) =>
                      onMemberChange({ ...newMember, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("Email")}*</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={newMember.email}
                    onChange={(e) =>
                      onMemberChange({ ...newMember, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">{t("Phone")}</Label>
                  <Input
                    id="phone"
                    placeholder="+234 800 000 0000"
                    value={newMember.phone}
                    onChange={(e) =>
                      onMemberChange({ ...newMember, phone: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">{t("Department")}</Label>
                  <Input
                    id="department"
                    placeholder={t("Sales")}
                    value={newMember.department}
                    onChange={(e) =>
                      onMemberChange({
                        ...newMember,
                        department: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">{t("Role")}</Label>
                <Select value={newMember.role} onValueChange={onRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">{t("Manager")}</SelectItem>
                    <SelectItem value="sales-assistant">
                      {t("Sales Assistant")}
                    </SelectItem>
                    <SelectItem value="checkout">{t("Check Out")}</SelectItem>
                    <SelectItem value="inventory">{t("Inventory")}</SelectItem>
                    <SelectItem value="investor">{t("Investor")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("Permissions")}</Label>
                <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
                  {(Object.keys(permissionDescriptions) as Permission[]).map(
                    (permission) => (
                      <div key={permission} className="flex items-start space-x-2">
                        <Checkbox
                          id={`perm-${permission}`}
                          checked={newMember.permissions.includes(permission)}
                          onCheckedChange={() => onPermissionToggle(permission)}
                        />
                        <div className="grid gap-1">
                          <label
                            htmlFor={`perm-${permission}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {t(permission.replace(/-/g, " "))}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {permissionDescriptions[permission]}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {t("Cancel")}
              </Button>
              <Button
                onClick={onAdd}
                disabled={!newMember.name.trim() || !newMember.email.trim()}
              >
                {t("Send Invitation")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}