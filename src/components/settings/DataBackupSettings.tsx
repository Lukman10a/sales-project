"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Database } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface DataBackupSettingsProps {
  onExportAll: () => void;
  onBackup: () => void;
}

export default function DataBackupSettings({
  onExportAll,
  onBackup,
}: DataBackupSettingsProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-xl text-foreground mb-1">
          {t("Data & Backup")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("Export and backup options")}
        </p>
      </div>
      <Separator />
      <div className="space-y-4">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onExportAll}
        >
          <Database className="w-4 h-4 mr-2" />
          {t("Export All Data")}
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onBackup}
        >
          <Database className="w-4 h-4 mr-2" />
          {t("Backup to Cloud")}
        </Button>
      </div>
    </div>
  );
}



