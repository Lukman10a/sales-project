// Types for inventory export and email functionality

export interface ExportOptions {
  format: "pdf";
  type: "all-stock" | "available-stock" | "out-of-stock" | "stock-taking";
  includeMetrics: boolean;
  includeImages: boolean;
  dateGenerated?: string;
}

export interface EmailExportOptions extends ExportOptions {
  recipientEmail: string;
  includeTimestamp: boolean;
  addCoverPage?: boolean;
}

export interface DailyEmailConfig {
  enabled: boolean;
  sendTime: string; // "HH:mm" format
  recipients: string[];
  reportType: "out-of-stock" | "low-stock" | "all-stock";
  dayOfWeek?: "all" | "weekdays" | "weekends";
}

export interface StockTakingConfig {
  date: string;
  notes?: string;
  location?: string;
  countedBy?: string;
}

export interface InventoryExportData {
  generatedAt: string;
  generatedBy?: string;
  exportType: string;
  totalItems: number;
  itemsIncluded: number;
  items: any[];
  summary?: {
    totalValue?: number;
    totalCost?: number;
    totalProfit?: number;
    averagePrice?: number;
    highestStockItem?: string;
    lowestStockItem?: string;
    outOfStockCount?: number;
    lowStockCount?: number;
  };
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType: string;
  }[];
}
