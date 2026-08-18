/**
 * Dashboard Customization Types
 * Types for dashboard widgets, layouts, and personalization
 */

export type WidgetType =
  | "sales-chart"
  | "stats-card"
  | "recent-sales"
  | "inventory-alerts"
  | "ai-insights"
  | "quick-actions"
  | "top-products"
  | "sales-by-category"
  | "hourly-trends"
  | "profit-chart"
  | "low-stock"
  | "notifications";

export type WidgetSize = "small" | "medium" | "large" | "full";
export type LayoutTemplate = "default" | "analytics" | "sales-focused" | "inventory-focused" | "custom";
export type RefreshInterval = "off" | "30s" | "1m" | "5m" | "15m" | "30m";

/**
 * Individual dashboard widget configuration
 */
export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  size: WidgetSize;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  enabled: boolean;
  config: Record<string, any>; // Widget-specific configuration
  refreshInterval?: RefreshInterval;
  lastUpdated?: Date;
}

/**
 * Dashboard layout configuration
 */
export interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  template: LayoutTemplate;
  widgets: Widget[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Widget catalog entry
 */
export interface WidgetCatalogItem {
  type: WidgetType;
  name: string;
  description: string;
  icon: string;
  category: "analytics" | "sales" | "inventory" | "general" | "ai";
  defaultSize: WidgetSize;
  availableSizes: WidgetSize[];
  requiresPermission?: string[];
  previewImage?: string;
}

/**
 * Dashboard theme preferences
 */
export interface DashboardTheme {
  colorScheme: "light" | "dark" | "auto";
  accentColor: string;
  chartStyle: "default" | "minimal" | "vibrant";
  cardStyle: "bordered" | "shadow" | "flat";
  compactMode: boolean;
  animations: boolean;
  highContrast: boolean;
}

/**
 * Quick action customization
 */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string; // route or action identifier
  color: string;
  enabled: boolean;
  order: number;
  requiresPermission?: string[];
}

/**
 * Dashboard view preferences
 */
export interface DashboardPreferences {
  userId: string;
  defaultView: string; // dashboard layout id
  theme: DashboardTheme;
  quickActions: QuickAction[];
  showWelcomeMessage: boolean;
  showTips: boolean;
  defaultDateRange: "today" | "week" | "month" | "custom";
  autoRefresh: boolean;
  refreshInterval: RefreshInterval;
  notifications: {
    desktop: boolean;
    sound: boolean;
    inApp: boolean;
  };
  customCss?: string;
}

/**
 * Widget data refresh configuration
 */
export interface WidgetRefreshConfig {
  widgetId: string;
  enabled: boolean;
  interval: RefreshInterval;
  lastRefresh: Date;
  nextRefresh: Date;
  errorCount: number;
  lastError?: string;
}

/**
 * Saved dashboard view
 */
export interface SavedView {
  id: string;
  name: string;
  description?: string;
  layoutId: string;
  filters: Record<string, any>;
  dateRange: {
    start: Date;
    end: Date;
  };
  isDefault: boolean;
  createdAt: Date;
  userId: string;
}

/**
 * Dashboard grid configuration
 */
export interface GridConfig {
  columns: number;
  rows: number;
  gap: number;
  cellSize: {
    width: number;
    height: number;
  };
  responsive: {
    mobile: { columns: number };
    tablet: { columns: number };
    desktop: { columns: number };
  };
}

/**
 * Export/Import layout data
 */
export interface LayoutExport {
  version: string;
  exportedAt: Date;
  layout: DashboardLayout;
  preferences: Partial<DashboardPreferences>;
  metadata: {
    exportedBy: string;
    deviceInfo: string;
  };
}
