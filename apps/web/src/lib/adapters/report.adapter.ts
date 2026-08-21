import type { Report } from "@/types/reportTypes";

export interface BackendReport {
  id: string;
  name: string;
  type: Report["type"];
  format: Report["format"];
  dateRange: { start: string; end: string };
  status: Report["status"];
  snapshot?: Record<string, any> | null;
  createdBy: string;
  createdByName?: string;
  createdAt: string | Date;
}

export function mapReportBackend(report: BackendReport): Report {
  const mapped: Report = {
    id: report.id,
    name: report.name,
    type: report.type,
    format: report.format,
    dateRange: report.dateRange,
    status: report.status,
    createdBy: report.createdBy,
    createdAt:
      report.createdAt instanceof Date
        ? report.createdAt.toISOString()
        : report.createdAt,
  };

  if (report.createdByName !== undefined) {
    mapped.createdByName = report.createdByName;
  }
  if (report.snapshot !== null && report.snapshot !== undefined) {
    mapped.snapshot = report.snapshot;
  }

  return mapped;
}