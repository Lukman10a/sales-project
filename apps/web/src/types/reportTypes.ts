export type ReportType =
  | "sales"
  | "inventory"
  | "profit"
  | "expenses"
  | "audit"
  | "investor"
  | "customer"
  | "team"
  | "custom";
export type ReportFormat = "pdf" | "csv" | "excel";
export type ReportFrequency = "once" | "daily" | "weekly" | "monthly";
export type ReportStatus = "pending" | "processing" | "completed" | "failed" | "scheduled";

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  description?: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  status: ReportStatus;
  format: ReportFormat;
  dateRange: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  snapshot?: Record<string, any>;
  fileUrl?: string;
  fileSize?: string;
}

export interface CreateReportInput {
  name: string;
  type: ReportType;
  format: ReportFormat;
  dateRange: {
    start: string;
    end: string;
  };
  includeCategories?: boolean;
  includeExpenses?: boolean;
  includeStaff?: boolean;
}

export interface ReportListResponse {
  data: Report[];
  total: number;
  page: number;
  limit: number;
}

export interface ScheduledReport {
  id: string;
  reportId: string;
  reportName: string;
  frequency: ReportFrequency;
  nextRun: string;
  recipients: string[];
  format: ReportFormat;
  active: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  icon: string;
  metrics: string[];
  requiredFields: string[];
}
