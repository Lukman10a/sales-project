import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, Download, FileSearch, Upload } from "lucide-react";
import {
  useInventoryData,
  type ImportResult,
} from "@/contexts/InventoryDataContext";
import { apiUrl } from "@/lib/api/client";
import type { ImportRecord } from "@/types/dataManagementTypes";

interface ImportTabProps {
  importRecords?: ImportRecord[];
}

type Step = "choose" | "preview" | "done";

/**
 * Product import: choose a CSV or Excel file, check the preview (each row's
 * verdict; nothing is saved yet), then confirm to save the valid rows.
 */
export default function ImportTab(_props: ImportTabProps = {}) {
  const { previewImport, confirmImport } = useInventoryData();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("choose");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const choose = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setPreview(null);
    setError(null);
    setStep("choose");
  };

  const run = async (action: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setPending(false);
    }
  };

  const check = () =>
    run(async () => {
      if (!file) return;
      setPreview(await previewImport(file));
      setStep("preview");
    });

  const save = () =>
    run(async () => {
      if (!file) return;
      setResult(await confirmImport(file));
      setStep("done");
      setFile(null);
      setPreview(null);
    });

  const startOver = () => {
    setFile(null);
    setPreview(null);
    setStep("choose");
    setError(null);
  };

  const s = preview?.summary;
  const problems = preview?.rows.filter((r) => r.errors.length > 0) ?? [];

  return (
    <TabsContent value="import" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Import products</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a href={apiUrl("/inventory/import/template")} download>
                <Download className="w-4 h-4 mr-2" />
                Download template
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-file">Choose a file</Label>
            <Input
              id="import-file"
              type="file"
              accept=".csv,.xlsx"
              onChange={choose}
            />
            <p className="text-xs text-muted-foreground">
              CSV or Excel (.xlsx), up to 5,000 rows and 5 MB. A row updates the
              product with the same SKU, barcode or name; its quantity is the
              stock you have now.
            </p>
          </div>

          {step === "choose" && (
            <Button onClick={check} disabled={!file || pending}>
              <FileSearch className="w-4 h-4 mr-2" />
              {pending ? "Checking..." : "Check file"}
            </Button>
          )}

          {step === "preview" && s && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">{s.rows} rows</Badge>
                <Badge variant="secondary">{s.creates} new</Badge>
                <Badge variant="secondary">{s.updates} updated</Badge>
                {s.invalid > 0 && (
                  <Badge variant="destructive">{s.invalid} with errors</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Nothing has been saved yet.
                {s.invalid > 0 &&
                  " Rows with errors will be skipped; fix them and import again to add them."}
              </p>
              {problems.length > 0 && (
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="p-2 w-16">Row</th>
                        <th className="p-2">Product</th>
                        <th className="p-2">Problem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.map((r) => (
                        <tr key={r.row} className="border-t align-top">
                          <td className="p-2 tabular-nums">{r.row}</td>
                          <td className="p-2">{r.name || "—"}</td>
                          <td className="p-2 text-destructive">
                            {r.errors.join("; ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={startOver} disabled={pending}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={pending || s.valid === 0}>
                  <Upload className="w-4 h-4 mr-2" />
                  {pending
                    ? "Importing..."
                    : `Import ${s.valid} product${s.valid === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
          )}

          {step === "done" && result && (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="w-4 h-4" />
              {result.summary.creates} added, {result.summary.updates} updated
              {result.summary.invalid > 0 &&
                `, ${result.summary.invalid} skipped`}
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
