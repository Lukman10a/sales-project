import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  HardDrive,
  Cloud,
  Database,
  Shield,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { formatFileSize } from "@/lib/dataUtils";
import type {
  DatabaseStats,
  BackupSchedule,
  IntegrityCheck,
} from "@/types/dataManagementTypes";

interface DataStatsProps {
  databaseStats: DatabaseStats;
  backupSchedule: BackupSchedule;
  integrityChecks: IntegrityCheck[];
}

export default function DataStats({
  databaseStats,
  backupSchedule,
  integrityChecks,
}: DataStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Size</p>
              <p className="text-2xl font-bold">
                {formatFileSize(databaseStats.totalSize)}
              </p>
            </div>
            <HardDrive className="w-10 h-10 text-primary/60" />
          </div>
          <Progress value={databaseStats.storageUsed} className="mt-3 h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {databaseStats.storageUsed.toFixed(1)}% of{" "}
            {formatFileSize(databaseStats.storageLimit)} used
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Last Backup</p>
              <p className="text-lg font-semibold">
                {databaseStats.lastBackup
                  ? format(databaseStats.lastBackup, "MMM dd, HH:mm")
                  : "Never"}
              </p>
            </div>
            <Cloud className="w-10 h-10 text-success/60" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {backupSchedule.enabled ? "Auto-backup enabled" : "Manual only"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Tables</p>
              <p className="text-2xl font-bold">
                {databaseStats.tables.length}
              </p>
            </div>
            <Database className="w-10 h-10 text-accent/60" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {databaseStats.tables
              .reduce((sum, t) => sum + t.records, 0)
              .toLocaleString()}{" "}
            total records
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Integrity Status</p>
              <p className="text-lg font-semibold flex items-center gap-2">
                {integrityChecks[0].status === "passed" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    Healthy
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Warnings
                  </>
                )}
              </p>
            </div>
            <Shield className="w-10 h-10 text-primary/60" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Last check: {format(integrityChecks[0].runAt, "MMM dd, HH:mm")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


