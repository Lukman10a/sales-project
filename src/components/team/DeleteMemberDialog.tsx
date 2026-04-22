"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { TeamMember } from "@/types/teamTypes";

interface DeleteMemberDialogProps {
  isOpen: boolean;
  deleteTarget: TeamMember | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteMemberDialog({
  isOpen,
  deleteTarget,
  onConfirm,
  onClose,
}: DeleteMemberDialogProps) {
  const { t } = useLanguage();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Remove Team Member")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "Are you sure you want to remove {name} from your team? This action cannot be undone.",
              {
                values: { name: deleteTarget?.name || "" },
              },
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {t("Remove")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


