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
import { useLanguage } from "@/contexts/LanguageContext";
import { TeamMember, TeamRole, Permission } from "@/types/teamTypes";
import { rolePermissions, permissionDescriptions } from "@/data/team";

interface AddMemberDialogProps {
  isOpen: boolean;
  newMember: Omit<TeamMember, "id" | "joinedDate">;
  onMemberChange: (member: Omit<TeamMember, "id" | "joinedDate">) => void;
  onRoleChange: (role: TeamRole) => void;
  onPermissionToggle: (permission: Permission) => void;
  onAdd: () => void;
  onClose: () => void;
}

export default function AddMemberDialog({
  isOpen,
  newMember,
  onMemberChange,
  onRoleChange,
  onPermissionToggle,
  onAdd,
  onClose,
}: AddMemberDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
      </DialogContent>
    </Dialog>
  );
}


