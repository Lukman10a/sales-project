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
import { TabsContent } from "@/components/ui/tabs";
import { Upload, Download } from "lucide-react";
import { format } from "date-fns";
import { getStatusColor, formatFileSize } from "@/lib/dataUtils";
import type {
  ExportRequest,
  DataType,
  ExportFormat,
} from "@/types/dataManagementTypes";

interface ExportTabProps {
  exportRequests: ExportRequest[];
}

export default function ExportTab({ exportRequests }: ExportTabProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFilter, setExportFilter] = useState<string>("all");
  const [newExport, setNewExport] = useState({
    dataType: "all" as DataType,
    format: "csv" as ExportFormat,
    startDate: "",
    endDate: "",
  });

  const filteredExports = exportRequests.filter((exp) => {
    if (exportFilter === "all") return true;
    return exp.status === exportFilter;
  });

  return (
    <TabsContent value="export" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Export Data</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={exportFilter} onValueChange={setExportFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exports</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Dialog
                open={exportDialogOpen}
                onOpenChange={setExportDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    New Export
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Data</DialogTitle>
                    <DialogDescription>
                      Export your data in various formats
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Data Type</Label>
                      <Select
                        value={newExport.dataType}
                        onValueChange={(value: DataType) =>
                          setNewExport({ ...newExport, dataType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Data</SelectItem>
                          <SelectItem value="products">Products</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="customers">Customers</SelectItem>
                          <SelectItem value="analytics">Analytics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Export Format</Label>
                      <Select
                        value={newExport.format}
                        onValueChange={(value: ExportFormat) =>
                          setNewExport({ ...newExport, format: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={newExport.startDate}
                          onChange={(e) =>
                            setNewExport({
                              ...newExport,
                              startDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={newExport.endDate}
                          onChange={(e) =>
                            setNewExport({
                              ...newExport,
                              endDate: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setExportDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => setExportDialogOpen(false)}>
                      Start Export
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredExports.map((exp) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{exp.fileName}</h3>
                      <Badge
                        variant="outline"
                        className={getStatusColor(exp.status)}
                      >
                        {exp.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs uppercase">
                        {exp.format}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        {format(exp.dateRange.start, "MMM dd")} -{" "}
                        {format(exp.dateRange.end, "MMM dd, yyyy")}
                      </span>
                      {exp.fileSize && (
                        <span>{formatFileSize(exp.fileSize)}</span>
                      )}
                      <span>
                        Expires: {format(exp.expiresAt, "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>
                  {exp.status === "completed" && (
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
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


