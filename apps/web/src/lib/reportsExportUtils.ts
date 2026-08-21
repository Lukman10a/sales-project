import { downloadFile, getExportFilename } from "./inventoryExportUtils";
import type { Report } from "@/types/reportTypes";

function csvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function exportReportCsv(report: Report): string {
  const snapshot = report.snapshot;
  if (!snapshot) return "";

  const items = snapshot.items;
  if (Array.isArray(items) && items.length > 0) {
    const keys = Object.keys(items[0]);
    const header = keys.map(csvValue).join(",");
    const rows = items.map((item) =>
      keys.map((key) => csvValue(item[key])).join(","),
    );
    return [header, ...rows].join("\n") + "\n";
  }

  const summary = snapshot.summary;
  if (summary && typeof summary === "object") {
    return (
      Object.entries(summary)
        .map(([key, value]) => `${csvValue(key)},${csvValue(value)}`)
        .join("\n") + "\n"
    );
  }

  return "";
}

export function downloadReportCsv(report: Report): boolean {
  const csv = exportReportCsv(report);
  if (!csv) return false;
  downloadFile(csv, getExportFilename(report.type, "csv"), "text/csv");
  return true;
}