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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TabsContent } from "@/components/ui/tabs";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { getStatusColor, formatFileSize } from "@/lib/dataUtils";
import type { ImportRecord } from "@/types/dataManagementTypes";

interface ImportTabProps {
  importRecords: ImportRecord[];
}

export default function ImportTab({ importRecords }: ImportTabProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  return (
    <TabsContent value="import" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Import History</CardTitle>
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Data</DialogTitle>
                  <DialogDescription>
                    Upload a file to import data
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Data Type</Label>
                    <Select defaultValue="products">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="products">Products</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="customers">Customers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Choose File</Label>
                    <Input type="file" accept=".csv,.xlsx,.json" />
                    <p className="text-xs text-muted-foreground">
                      Supported formats: CSV, XLSX, JSON
                    </p>
                  </div>
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      Importing data may overwrite existing records. Always
                      backup before importing.
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setImportDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => setImportDialogOpen(false)}>
                    Start Import
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {importRecords.map((record) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{record.fileName}</h3>
                      <Badge
                        variant="outline"
                        className={getStatusColor(record.status)}
                      >
                        {record.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        {format(record.uploadedAt, "MMM dd, yyyy HH:mm")}
                      </span>
                      <span>{formatFileSize(record.fileSize)}</span>
                      <span>By {record.importedBy}</span>
                    </div>
                    {record.status === "completed" && (
                      <div className="mt-3 flex items-center gap-4 text-xs">
                        <span className="text-success flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {record.successfulRecords} successful
                        </span>
                        {record.failedRecords > 0 && (
                          <span className="text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {record.failedRecords} failed
                          </span>
                        )}
                      </div>
                    )}
                    {record.errors && record.errors.length > 0 && (
                      <div className="mt-2 text-xs text-destructive">
                        {record.errors.slice(0, 2).map((error, i) => (
                          <div key={i}>• {error}</div>
                        ))}
                        {record.errors.length > 2 && (
                          <div>...and {record.errors.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}


