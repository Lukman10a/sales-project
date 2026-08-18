import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import {
  Download,
  Settings,
  Play,
  Calendar,
  HardDrive,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { getStatusColor, formatFileSize } from "@/lib/dataUtils";
import type {
  Backup,
  BackupSchedule,
  DataType,
} from "@/types/dataManagementTypes";

interface BackupsTabProps {
  backups: Backup[];
  backupSchedule: BackupSchedule;
}

export default function BackupsTab({
  backups,
  backupSchedule,
}: BackupsTabProps) {
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [backupFilter, setBackupFilter] = useState<string>("all");
  const [newBackup, setNewBackup] = useState({
    name: "",
    type: "all" as DataType,
    description: "",
  });

  const filteredBackups = backups.filter((backup) => {
    if (backupFilter === "all") return true;
    return backup.status === backupFilter;
  });

  return (
    <TabsContent value="backups" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Backup History</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={backupFilter} onValueChange={setBackupFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Backups</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Dialog
                open={scheduleDialogOpen}
                onOpenChange={setScheduleDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Backup Schedule</DialogTitle>
                    <DialogDescription>
                      Configure automatic backup settings
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                      <Label>Enable Auto Backup</Label>
                      <Switch defaultChecked={backupSchedule.enabled} />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select defaultValue={backupSchedule.frequency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input type="time" defaultValue={backupSchedule.time} />
                    </div>
                    <div className="space-y-2">
                      <Label>Retention Period (days)</Label>
                      <Input
                        type="number"
                        defaultValue={backupSchedule.retentionDays}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Cloud Storage</Label>
                      <Switch defaultChecked={backupSchedule.cloudStorage} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setScheduleDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => setScheduleDialogOpen(false)}>
                      Save Schedule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog
                open={backupDialogOpen}
                onOpenChange={setBackupDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Download className="w-4 h-4 mr-2" />
                    Create Backup
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Backup</DialogTitle>
                    <DialogDescription>
                      Create a manual backup of your data
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Backup Name</Label>
                      <Input
                        placeholder="e.g., Pre-migration backup"
                        value={newBackup.name}
                        onChange={(e) =>
                          setNewBackup({
                            ...newBackup,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Type</Label>
                      <Select
                        value={newBackup.type}
                        onValueChange={(value: DataType) =>
                          setNewBackup({ ...newBackup, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Data</SelectItem>
                          <SelectItem value="products">
                            Products Only
                          </SelectItem>
                          <SelectItem value="sales">Sales Only</SelectItem>
                          <SelectItem value="customers">
                            Customers Only
                          </SelectItem>
                          <SelectItem value="analytics">
                            Analytics Only
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Input
                        placeholder="Add notes about this backup"
                        value={newBackup.description}
                        onChange={(e) =>
                          setNewBackup({
                            ...newBackup,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setBackupDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => setBackupDialogOpen(false)}>
                      Create Backup
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredBackups.map((backup) => (
              <motion.div
                key={backup.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{backup.name}</h3>
                      <Badge
                        variant="outline"
                        className={getStatusColor(backup.status)}
                      >
                        {backup.status}
                      </Badge>
                      {backup.isAutoBackup && (
                        <Badge variant="outline" className="text-xs">
                          Auto
                        </Badge>
                      )}
                    </div>
                    {backup.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {backup.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(backup.createdAt, "MMM dd, yyyy HH:mm")}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {formatFileSize(backup.size)}
                      </span>
                      {backup.recordCount > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {backup.recordCount.toLocaleString()} records
                        </span>
                      )}
                    </div>
                  </div>
                  {backup.status === "completed" && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        <Play className="w-4 h-4 mr-2" />
                        Restore
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}


