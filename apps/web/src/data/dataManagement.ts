import {
  Backup,
  BackupSchedule,
  ExportRequest,
  ImportRecord,
  DatabaseStats,
  DataCleanup,
  IntegrityCheck,
} from "@/types/dataManagementTypes";

/**
 * Mock backup history
 */
export const backups: Backup[] = [
  {
    id: "backup-1",
    name: "Daily Auto Backup",
    type: "all",
    size: 45.3,
    createdAt: new Date(2024, 0, 15, 2, 0),
    status: "completed",
    location: "cloud://backups/2024-01-15-daily.db",
    description: "Automated daily backup of all data",
    includedTables: [
      "products",
      "sales",
      "customers",
      "inventory",
      "users",
      "analytics",
    ],
    recordCount: 15420,
    isAutoBackup: true,
    nextScheduledBackup: new Date(2024, 0, 16, 2, 0),
  },
  {
    id: "backup-2",
    name: "Pre-Update Manual Backup",
    type: "all",
    size: 43.1,
    createdAt: new Date(2024, 0, 14, 10, 30),
    status: "completed",
    location: "cloud://backups/2024-01-14-manual.db",
    description: "Manual backup before system update",
    includedTables: [
      "products",
      "sales",
      "customers",
      "inventory",
      "users",
      "analytics",
    ],
    recordCount: 15200,
    isAutoBackup: false,
  },
  {
    id: "backup-3",
    name: "Weekly Backup",
    type: "all",
    size: 38.7,
    createdAt: new Date(2024, 0, 8, 2, 0),
    status: "completed",
    location: "cloud://backups/2024-01-08-weekly.db",
    description: "Weekly full backup",
    includedTables: [
      "products",
      "sales",
      "customers",
      "inventory",
      "users",
      "analytics",
    ],
    recordCount: 14100,
    isAutoBackup: true,
  },
  {
    id: "backup-4",
    name: "Sales Data Only",
    type: "sales",
    size: 12.4,
    createdAt: new Date(2024, 0, 13, 15, 45),
    status: "completed",
    location: "local://backups/2024-01-13-sales.json",
    description: "Export of sales records for accounting",
    includedTables: ["sales", "transactions", "receipts"],
    recordCount: 3450,
    isAutoBackup: false,
  },
  {
    id: "backup-5",
    name: "In Progress Backup",
    type: "all",
    size: 0,
    createdAt: new Date(),
    status: "in-progress",
    location: "cloud://backups/temp.db",
    description: "Currently creating backup",
    includedTables: [],
    recordCount: 0,
    isAutoBackup: false,
  },
];

/**
 * Mock backup schedule configuration
 */
export const backupSchedule: BackupSchedule = {
  id: "schedule-1",
  enabled: true,
  frequency: "daily",
  time: "02:00",
  dataTypes: ["all"],
  retentionDays: 30,
  cloudStorage: true,
  cloudProvider: "google-drive",
  emailNotification: true,
  emailRecipients: ["ahmed.hassan@luxa.com", "backup-notifications@luxa.com"],
};

/**
 * Mock export requests
 */
export const exportRequests: ExportRequest[] = [
  {
    id: "export-1",
    dataType: "sales",
    format: "xlsx",
    dateRange: {
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 15),
    },
    status: "completed",
    fileName: "sales-report-jan-2024.xlsx",
    fileSize: 2.3,
    downloadUrl: "/downloads/sales-report-jan-2024.xlsx",
    createdAt: new Date(2024, 0, 15, 9, 30),
    expiresAt: new Date(2024, 0, 22, 9, 30),
  },
  {
    id: "export-2",
    dataType: "products",
    format: "csv",
    dateRange: {
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 15),
    },
    status: "completed",
    fileName: "inventory-snapshot.csv",
    fileSize: 0.8,
    downloadUrl: "/downloads/inventory-snapshot.csv",
    createdAt: new Date(2024, 0, 14, 14, 20),
    expiresAt: new Date(2024, 0, 21, 14, 20),
  },
  {
    id: "export-3",
    dataType: "analytics",
    format: "pdf",
    dateRange: {
      start: new Date(2023, 11, 1),
      end: new Date(2023, 11, 31),
    },
    status: "processing",
    fileName: "december-analytics.pdf",
    createdAt: new Date(2024, 0, 15, 11, 0),
    expiresAt: new Date(2024, 0, 22, 11, 0),
  },
];

/**
 * Mock import history
 */
export const importRecords: ImportRecord[] = [
  {
    id: "import-1",
    fileName: "new-products-batch.csv",
    fileSize: 1.2,
    dataType: "products",
    status: "completed",
    uploadedAt: new Date(2024, 0, 10, 10, 15),
    processedAt: new Date(2024, 0, 10, 10, 18),
    totalRecords: 150,
    successfulRecords: 148,
    failedRecords: 2,
    errors: [
      "Row 45: Missing required field 'price'",
      "Row 89: Invalid category 'Electronics'",
    ],
    importedBy: "Ahmed Hassan",
  },
  {
    id: "import-2",
    fileName: "customer-list.xlsx",
    fileSize: 0.9,
    dataType: "customers",
    status: "completed",
    uploadedAt: new Date(2024, 0, 5, 14, 30),
    processedAt: new Date(2024, 0, 5, 14, 32),
    totalRecords: 85,
    successfulRecords: 85,
    failedRecords: 0,
    importedBy: "Ahmed Hassan",
  },
  {
    id: "import-3",
    fileName: "sales-data.json",
    fileSize: 3.5,
    dataType: "sales",
    status: "failed",
    uploadedAt: new Date(2024, 0, 12, 16, 0),
    processedAt: new Date(2024, 0, 12, 16, 2),
    totalRecords: 0,
    successfulRecords: 0,
    failedRecords: 0,
    errors: ["Invalid JSON format", "Schema validation failed"],
    importedBy: "Ahmed Hassan",
  },
];

/**
 * Mock database statistics
 */
export const databaseStats: DatabaseStats = {
  totalSize: 156.7,
  tables: [
    {
      name: "products",
      records: 324,
      size: 15.4,
      lastModified: new Date(2024, 0, 15, 14, 30),
    },
    {
      name: "sales",
      records: 3450,
      size: 48.2,
      lastModified: new Date(2024, 0, 15, 18, 45),
    },
    {
      name: "customers",
      records: 1240,
      size: 22.1,
      lastModified: new Date(2024, 0, 15, 12, 20),
    },
    {
      name: "inventory_logs",
      records: 8920,
      size: 31.5,
      lastModified: new Date(2024, 0, 15, 17, 10),
    },
    {
      name: "analytics",
      records: 2150,
      size: 18.9,
      lastModified: new Date(2024, 0, 15, 19, 0),
    },
    {
      name: "users",
      records: 12,
      size: 0.8,
      lastModified: new Date(2024, 0, 10, 9, 0),
    },
    {
      name: "notifications",
      records: 4520,
      size: 12.3,
      lastModified: new Date(2024, 0, 15, 18, 30),
    },
    {
      name: "reports",
      records: 245,
      size: 7.5,
      lastModified: new Date(2024, 0, 14, 16, 40),
    },
  ],
  lastBackup: new Date(2024, 0, 15, 2, 0),
  lastOptimization: new Date(2024, 0, 8, 3, 0),
  storageUsed: 31.34, // percentage
  storageLimit: 500, // MB
};

/**
 * Mock data cleanup configuration
 */
export const dataCleanup: DataCleanup = {
  enabled: true,
  rules: [
    {
      id: "cleanup-1",
      name: "Delete Old Notifications",
      dataType: "all",
      condition: "older-than",
      value: "30 days",
      action: "delete",
      lastRun: new Date(2024, 0, 1, 3, 0),
      nextRun: new Date(2024, 1, 1, 3, 0),
    },
    {
      id: "cleanup-2",
      name: "Archive Completed Sales",
      dataType: "sales",
      condition: "older-than",
      value: "90 days",
      action: "archive",
      lastRun: new Date(2024, 0, 1, 3, 15),
      nextRun: new Date(2024, 3, 1, 3, 15),
    },
    {
      id: "cleanup-3",
      name: "Remove Failed Imports",
      dataType: "all",
      condition: "status-equals",
      value: "failed",
      action: "delete",
      lastRun: new Date(2024, 0, 8, 3, 30),
      nextRun: new Date(2024, 0, 15, 3, 30),
    },
  ],
};

/**
 * Mock integrity check results
 */
export const integrityChecks: IntegrityCheck[] = [
  {
    id: "check-1",
    runAt: new Date(2024, 0, 15, 3, 0),
    duration: 45,
    status: "passed",
    issues: [],
    summary: {
      totalChecks: 24,
      passed: 24,
      warnings: 0,
      errors: 0,
    },
  },
  {
    id: "check-2",
    runAt: new Date(2024, 0, 8, 3, 0),
    duration: 52,
    status: "warning",
    issues: [
      {
        table: "sales",
        issueType: "missing-reference",
        description: "3 sales records reference non-existent products",
        severity: "medium",
        recordId: "sale-234, sale-567, sale-890",
        autoFixable: false,
      },
      {
        table: "inventory_logs",
        issueType: "orphaned",
        description: "12 inventory logs have no associated product",
        severity: "low",
        autoFixable: true,
      },
    ],
    summary: {
      totalChecks: 24,
      passed: 22,
      warnings: 2,
      errors: 0,
    },
  },
  {
    id: "check-3",
    runAt: new Date(2024, 0, 1, 3, 0),
    duration: 48,
    status: "warning",
    issues: [
      {
        table: "customers",
        issueType: "duplicate",
        description: "2 duplicate customer email addresses found",
        severity: "medium",
        recordId: "cust-123, cust-456",
        autoFixable: false,
      },
    ],
    summary: {
      totalChecks: 24,
      passed: 23,
      warnings: 1,
      errors: 0,
    },
  },
];
