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
import {
  TeamMember,
  TeamRole,
  TeamStatus,
  Permission,
} from "@/types/teamTypes";
import { rolePermissions, permissionDescriptions } from "@/data/team";

interface EditMemberDialogProps {
  isOpen: boolean;
  editingMember: TeamMember | null;
  onMemberChange: (member: TeamMember) => void;
  onRoleChange: (role: TeamRole) => void;
  onPermissionToggle: (permission: Permission) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function EditMemberDialog({
  isOpen,
  editingMember,
  onMemberChange,
  onRoleChange,
  onPermissionToggle,
  onSave,
  onClose,
}: EditMemberDialogProps) {
  const { t } = useLanguage();

  if (!editingMember) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Edit Team Member")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t("Full Name")}</Label>
              <Input
                id="edit-name"
                value={editingMember.name}
                onChange={(e) =>
                  onMemberChange({ ...editingMember, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">{t("Email")}</Label>
              <Input
                id="edit-email"
                value={editingMember.email}
                onChange={(e) =>
                  onMemberChange({ ...editingMember, email: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">{t("Phone")}</Label>
              <Input
                id="edit-phone"
                value={editingMember.phone || ""}
                onChange={(e) =>
                  onMemberChange({ ...editingMember, phone: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-department">{t("Department")}</Label>
              <Input
                id="edit-department"
                value={editingMember.department || ""}
                onChange={(e) =>
                  onMemberChange({
                    ...editingMember,
                    department: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-role">{t("Role")}</Label>
              <Select
                value={editingMember.role}
                onValueChange={onRoleChange}
                disabled={editingMember.role === "owner"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t("Owner")}</SelectItem>
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
              <Label htmlFor="edit-status">{t("Status")}</Label>
              <Select
                value={editingMember.status}
                onValueChange={(value) =>
                  onMemberChange({
                    ...editingMember,
                    status: value as TeamStatus,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("Active")}</SelectItem>
                  <SelectItem value="inactive">{t("Inactive")}</SelectItem>
                  <SelectItem value="invited">{t("Invited")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("Permissions")}</Label>
            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
              {(Object.keys(permissionDescriptions) as Permission[]).map(
                (permission) => (
                  <div key={permission} className="flex items-start space-x-2">
                    <Checkbox
                      id={`edit-perm-${permission}`}
                      checked={editingMember.permissions.includes(permission)}
                      onCheckedChange={() => onPermissionToggle(permission)}
                    />
                    <div className="grid gap-1">
                      <label
                        htmlFor={`edit-perm-${permission}`}
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
          <Button onClick={onSave}>{t("Save Changes")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


