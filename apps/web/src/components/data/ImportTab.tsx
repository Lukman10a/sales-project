import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useInventoryData } from "@/contexts/InventoryDataContext";
import type { ImportRecord } from "@/types/dataManagementTypes";

interface ImportTabProps {
  importRecords?: ImportRecord[];
}

export default function ImportTab(_props: ImportTabProps = {}) {
  const { bulkImportInventory } = useInventoryData();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsPending(true);
    setError(null);
    try {
      const res = await bulkImportInventory(selectedFile);
      setResult(res);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      setIsPending(false);
    }
  };

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
                  <DialogDescription>Upload a file to import data</DialogDescription>
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
                    <Input type="file" accept=".csv,.xlsx,.json" onChange={handleFileChange} />
                    {selectedFile && (
                      <p className="text-xs text-muted-foreground">{selectedFile.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Supported formats: CSV, XLSX, JSON</p>
                  </div>
                  {result && (
                    <div className="p-3 border rounded-lg text-sm space-y-1">
                      <p className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        {result.imported} imported, {result.skipped} skipped
                      </p>
                      {result.errors.length > 0 && (
                        <div className="text-destructive text-xs">
                          {result.errors.map((e, i) => (
                            <div key={i}>• {e}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>Importing data may overwrite existing records. Always backup before importing.</AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport} disabled={!selectedFile || isPending}>
                    {isPending ? "Importing..." : "Start Import"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="p-4 border rounded-lg space-y-2">
              <p className="text-sm font-medium">
                Last import: {result.imported} imported, {result.skipped} skipped
              </p>
              {result.errors.length > 0 && (
                <div className="text-xs text-destructive">
                  {result.errors.map((e, i) => (
                    <div key={i}>• {e}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No import history — import a file to see results</p>
          )}
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
