"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";
import {
  generateInventoryExportData,
  generateHTMLTable,
  downloadFile,
  getExportFilename,
  generateCSVContent,
} from "@/lib/inventoryExportUtils";
import { Download, FileText, Mail } from "lucide-react";
import { ExportOptions } from "@/types/inventoryExportTypes";

interface InventoryExportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryItem[];
}

export default function InventoryExportDialog({
  isOpen,
  onOpenChange,
  inventory,
}: InventoryExportDialogProps) {
  const { t } = useLanguage();
  const [exportType, setExportType] =
    useState<ExportOptions["type"]>("all-stock");
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [exportFormat, setExportFormat] = useState<"html" | "csv">("html");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      const options: ExportOptions = {
        format: "pdf",
        type: exportType,
        includeMetrics,
        includeImages: false,
      };

      const exportData = generateInventoryExportData(inventory, options);

      if (exportFormat === "html") {
        const title = getExportTitle(exportType);
        const htmlContent = generateHTMLTable(exportData, title, false);
        const filename = getExportFilename(exportType, "html");
        downloadFile(htmlContent, filename, "text/html;charset=utf-8");
      } else {
        const csvContent = generateCSVContent(exportData);
        const filename = getExportFilename(exportType, "csv");
        downloadFile(csvContent, filename, "text/csv;charset=utf-8");
      }

      toast.success(
        t("Export generated successfully") || "Export generated successfully",
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(t("Export failed") || "Export failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const getExportTitle = (type: ExportOptions["type"]): string => {
    switch (type) {
      case "all-stock":
        return "Complete Inventory Report";
      case "available-stock":
        return "Available Stock Report";
      case "out-of-stock":
        return "Out-of-Stock Items Report";
      case "stock-taking":
        return "Stock Taking Report";
      default:
        return "Inventory Report";
    }
  };

  const getItemCount = (): number => {
    switch (exportType) {
      case "out-of-stock":
        return inventory.filter((i) => i.status === "out-of-stock").length;
      case "available-stock":
        return inventory.filter((i) => i.status !== "out-of-stock").length;
      case "all-stock":
      case "stock-taking":
      default:
        return inventory.length;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            {t("Export Inventory")}
          </DialogTitle>
          <DialogDescription>
            {t("Generate and download inventory reports in various formats")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("Report Type")}
            </label>
            <Select
              value={exportType}
              onValueChange={(value: any) => setExportType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-stock">
                  📦 All Stock ({inventory.length} items)
                </SelectItem>
                <SelectItem value="available-stock">
                  ✓ Available Stock (
                  {inventory.filter((i) => i.status !== "out-of-stock").length}{" "}
                  items)
                </SelectItem>
                <SelectItem value="out-of-stock">
                  ✗ Out-of-Stock (
                  {inventory.filter((i) => i.status === "out-of-stock").length}{" "}
                  items)
                </SelectItem>
                <SelectItem value="stock-taking">
                  📋 Stock Taking Report
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("Export Format")}
            </label>
            <Select
              value={exportFormat}
              onValueChange={(value: any) => setExportFormat(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="html">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    HTML (Printable)
                  </div>
                </SelectItem>
                <SelectItem value="csv">📊 CSV (Spreadsheet)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {exportFormat === "html"
                ? "HTML format is printable and includes styling"
                : "CSV format can be opened in Excel or Google Sheets"}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/50">
            <div className="flex items-center gap-2">
              <Checkbox
                id="metrics"
                checked={includeMetrics}
                onCheckedChange={(checked) =>
                  setIncludeMetrics(checked === true)
                }
              />
              <label
                htmlFor="metrics"
                className="text-sm font-medium cursor-pointer text-foreground"
              >
                {t("Include Summary & Metrics")}
              </label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              {t("Adds summary section with total values and analytics")}
            </p>
          </div>

          {/* Preview Info */}
          <div className="rounded-lg border border-border/50 bg-blue-50 dark:bg-blue-950/20 p-3">
            <p className="text-sm">
              <span className="font-semibold text-blue-700 dark:text-blue-300">
                📊 Preview:
              </span>{" "}
              <span className="text-blue-600 dark:text-blue-400">
                {getItemCount()} items will be included in this export
              </span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isProcessing}
            className="bg-gradient-accent text-accent-foreground hover:opacity-90"
          >
            {isProcessing ? (
              <>
                <span className="inline-block animate-spin mr-2">⌛</span>
                {t("Generating...")}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {t("Download Report")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
