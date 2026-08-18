/**
 * Data Management Types
 * Types for backup, restore, import/export, and database management
 */

export type BackupFrequency = "daily" | "weekly" | "monthly" | "manual";
export type BackupStatus = "completed" | "in-progress" | "failed" | "scheduled";
export type DataType =
  | "all"
  | "products"
  | "sales"
  | "customers"
  | "analytics"
  | "team"
  | "settings";
export type ExportFormat = "csv" | "json" | "xlsx" | "pdf";
export type ImportStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Backup configuration and history
 */
export interface Backup {
  id: string;
  name: string;
  type: DataType;
  size: number; // in MB
  createdAt: Date;
  status: BackupStatus;
  location: string; // cloud storage path or local path
  description?: string;
  includedTables: string[];
  recordCount: number;
  isAutoBackup: boolean;
  nextScheduledBackup?: Date;
}

/**
 * Backup schedule settings
 */
export interface BackupSchedule {
  id: string;
  enabled: boolean;
  frequency: BackupFrequency;
  time: string; // HH:MM format
  dataTypes: DataType[];
  retentionDays: number;
  cloudStorage: boolean;
  cloudProvider?: "google-drive" | "dropbox" | "onedrive" | "aws-s3";
  emailNotification: boolean;
  emailRecipients: string[];
}

/**
 * Data export request
 */
export interface ExportRequest {
  id: string;
  dataType: DataType;
  format: ExportFormat;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  status: "pending" | "processing" | "completed" | "failed";
  fileName: string;
  fileSize?: number;
  downloadUrl?: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Data import record
 */
export interface ImportRecord {
  id: string;
  fileName: string;
  fileSize: number;
  dataType: DataType;
  status: ImportStatus;
  uploadedAt: Date;
  processedAt?: Date;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors?: string[];
  importedBy: string;
  preview?: any[]; // First few records for preview
}

/**
 * Database statistics
 */
export interface DatabaseStats {
  totalSize: number; // in MB
  tables: {
    name: string;
    records: number;
    size: number;
    lastModified: Date;
  }[];
  lastBackup?: Date;
  lastOptimization?: Date;
  storageUsed: number; // percentage
  storageLimit: number; // in MB
}

/**
 * Data cleanup settings
 */
export interface DataCleanup {
  enabled: boolean;
  rules: {
    id: string;
    name: string;
    dataType: DataType;
    condition: "older-than" | "status-equals" | "custom";
    value: string; // e.g., "90 days", "completed"
    action: "delete" | "archive";
    lastRun?: Date;
    nextRun?: Date;
  }[];
}

/**
 * Data integrity check result
 */
export interface IntegrityCheck {
  id: string;
  runAt: Date;
  duration: number; // in seconds
  status: "passed" | "warning" | "failed";
  issues: {
    table: string;
    issueType: "missing-reference" | "duplicate" | "invalid-data" | "orphaned";
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    recordId?: string;
    autoFixable: boolean;
  }[];
  summary: {
    totalChecks: number;
    passed: number;
    warnings: number;
    errors: number;
  };
}
