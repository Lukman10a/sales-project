import {
  Widget,
  DashboardLayout,
  WidgetCatalogItem,
  DashboardTheme,
  QuickAction,
  DashboardPreferences,
  SavedView,
  GridConfig,
} from "@/types/dashboardCustomizationTypes";

/**
 * Widget catalog - available widgets users can add
 */
export const widgetCatalog: WidgetCatalogItem[] = [
  {
    type: "sales-chart",
    name: "Sales Chart",
    description: "Weekly sales trends with profit overlay",
    icon: "LineChart",
    category: "sales",
    defaultSize: "large",
    availableSizes: ["medium", "large", "full"],
  },
  {
    type: "stats-card",
    name: "Statistics Card",
    description: "Key performance indicators",
    icon: "BarChart3",
    category: "analytics",
    defaultSize: "small",
    availableSizes: ["small", "medium"],
  },
  {
    type: "recent-sales",
    name: "Recent Sales",
    description: "Latest sales transactions",
    icon: "ShoppingCart",
    category: "sales",
    defaultSize: "medium",
    availableSizes: ["medium", "large"],
  },
  {
    type: "inventory-alerts",
    name: "Inventory Alerts",
    description: "Low stock and out of stock warnings",
    icon: "AlertTriangle",
    category: "inventory",
    defaultSize: "medium",
    availableSizes: ["small", "medium", "large"],
  },
  {
    type: "ai-insights",
    name: "AI Insights",
    description: "Smart recommendations and predictions",
    icon: "Sparkles",
    category: "ai",
    defaultSize: "medium",
    availableSizes: ["medium", "large"],
  },
  {
    type: "quick-actions",
    name: "Quick Actions",
    description: "Shortcuts to common tasks",
    icon: "Zap",
    category: "general",
    defaultSize: "small",
    availableSizes: ["small", "medium"],
  },
  {
    type: "top-products",
    name: "Top Products",
    description: "Best performing products",
    icon: "TrendingUp",
    category: "analytics",
    defaultSize: "medium",
    availableSizes: ["medium", "large"],
  },
  {
    type: "sales-by-category",
    name: "Sales by Category",
    description: "Category-wise sales distribution",
    icon: "PieChart",
    category: "analytics",
    defaultSize: "medium",
    availableSizes: ["medium", "large"],
  },
  {
    type: "hourly-trends",
    name: "Hourly Trends",
    description: "Sales patterns throughout the day",
    icon: "Clock",
    category: "analytics",
    defaultSize: "large",
    availableSizes: ["medium", "large"],
  },
  {
    type: "profit-chart",
    name: "Profit Chart",
    description: "Profit margins over time",
    icon: "DollarSign",
    category: "analytics",
    defaultSize: "medium",
    availableSizes: ["medium", "large"],
  },
  {
    type: "low-stock",
    name: "Low Stock Items",
    description: "Products running low on inventory",
    icon: "Package",
    category: "inventory",
    defaultSize: "small",
    availableSizes: ["small", "medium"],
  },
  {
    type: "notifications",
    name: "Recent Notifications",
    description: "Latest system notifications",
    icon: "Bell",
    category: "general",
    defaultSize: "medium",
    availableSizes: ["small", "medium"],
  },
];

/**
 * Default dashboard layout
 */
export const defaultLayout: DashboardLayout = {
  id: "layout-default",
  name: "Default Dashboard",
  description: "Standard overview of all key metrics",
  template: "default",
  isDefault: true,
  isActive: true,
  createdAt: new Date(2024, 0, 1),
  updatedAt: new Date(2024, 0, 15),
  widgets: [
    {
      id: "widget-1",
      type: "stats-card",
      title: "Today's Sales",
      description: "Total sales for today",
      size: "small",
      position: { x: 0, y: 0, width: 1, height: 1 },
      enabled: true,
      config: { metric: "sales", period: "today" },
      refreshInterval: "1m",
    },
    {
      id: "widget-2",
      type: "stats-card",
      title: "Items Sold",
      description: "Number of items sold today",
      size: "small",
      position: { x: 1, y: 0, width: 1, height: 1 },
      enabled: true,
      config: { metric: "items", period: "today" },
      refreshInterval: "1m",
    },
    {
      id: "widget-3",
      type: "stats-card",
      title: "In Stock",
      description: "Total inventory count",
      size: "small",
      position: { x: 2, y: 0, width: 1, height: 1 },
      enabled: true,
      config: { metric: "stock", period: "current" },
      refreshInterval: "5m",
    },
    {
      id: "widget-4",
      type: "stats-card",
      title: "Profit Margin",
      description: "Today's profit percentage",
      size: "small",
      position: { x: 3, y: 0, width: 1, height: 1 },
      enabled: true,
      config: { metric: "profit", period: "today" },
      refreshInterval: "5m",
    },
    {
      id: "widget-5",
      type: "sales-chart",
      title: "Weekly Sales",
      description: "Sales and profit trends",
      size: "large",
      position: { x: 0, y: 1, width: 2, height: 2 },
      enabled: true,
      config: { chartType: "line", period: "week" },
      refreshInterval: "5m",
    },
    {
      id: "widget-6",
      type: "recent-sales",
      title: "Recent Sales",
      description: "Latest transactions",
      size: "medium",
      position: { x: 2, y: 1, width: 2, height: 2 },
      enabled: true,
      config: { limit: 5 },
      refreshInterval: "30s",
    },
    {
      id: "widget-7",
      type: "inventory-alerts",
      title: "Inventory Alerts",
      description: "Stock warnings",
      size: "medium",
      position: { x: 0, y: 3, width: 2, height: 1 },
      enabled: true,
      config: { showLowStock: true, showOutOfStock: true },
      refreshInterval: "5m",
    },
    {
      id: "widget-8",
      type: "ai-insights",
      title: "AI Insights",
      description: "Smart recommendations",
      size: "medium",
      position: { x: 2, y: 3, width: 2, height: 1 },
      enabled: true,
      config: { limit: 3, priority: "high" },
      refreshInterval: "15m",
    },
  ],
};

/**
 * Analytics-focused dashboard layout
 */
export const analyticsLayout: DashboardLayout = {
  id: "layout-analytics",
  name: "Analytics Dashboard",
  description: "Deep dive into sales analytics and trends",
  template: "analytics",
  isDefault: false,
  isActive: false,
  createdAt: new Date(2024, 0, 5),
  updatedAt: new Date(2024, 0, 10),
  widgets: [
    {
      id: "widget-a1",
      type: "sales-chart",
      title: "Sales Overview",
      description: "Comprehensive sales trends",
      size: "full",
      position: { x: 0, y: 0, width: 4, height: 2 },
      enabled: true,
      config: { chartType: "line", period: "month" },
      refreshInterval: "5m",
    },
    {
      id: "widget-a2",
      type: "sales-by-category",
      title: "Sales by Category",
      description: "Category distribution",
      size: "medium",
      position: { x: 0, y: 2, width: 2, height: 2 },
      enabled: true,
      config: { chartType: "pie" },
      refreshInterval: "15m",
    },
    {
      id: "widget-a3",
      type: "top-products",
      title: "Top Products",
      description: "Best sellers",
      size: "medium",
      position: { x: 2, y: 2, width: 2, height: 2 },
      enabled: true,
      config: { limit: 10 },
      refreshInterval: "15m",
    },
    {
      id: "widget-a4",
      type: "hourly-trends",
      title: "Hourly Trends",
      description: "Sales by hour",
      size: "large",
      position: { x: 0, y: 4, width: 4, height: 2 },
      enabled: true,
      config: { chartType: "bar" },
      refreshInterval: "15m",
    },
  ],
};

/**
 * Sales-focused dashboard layout
 */
export const salesLayout: DashboardLayout = {
  id: "layout-sales",
  name: "Sales Dashboard",
  description: "Quick access to sales operations",
  template: "sales-focused",
  isDefault: false,
  isActive: false,
  createdAt: new Date(2024, 0, 3),
  updatedAt: new Date(2024, 0, 12),
  widgets: [
    {
      id: "widget-s1",
      type: "quick-actions",
      title: "Quick Actions",
      description: "Common sales tasks",
      size: "small",
      position: { x: 0, y: 0, width: 1, height: 1 },
      enabled: true,
      config: {},
    },
    {
      id: "widget-s2",
      type: "stats-card",
      title: "Today's Sales",
      description: "Sales total",
      size: "small",
      position: { x: 1, y: 0, width: 1, height: 1 },
      enabled: true,
      config: { metric: "sales", period: "today" },
      refreshInterval: "30s",
    },
    {
      id: "widget-s3",
      type: "recent-sales",
      title: "Recent Sales",
      description: "Latest transactions",
      size: "large",
      position: { x: 2, y: 0, width: 2, height: 3 },
      enabled: true,
      config: { limit: 10 },
      refreshInterval: "30s",
    },
    {
      id: "widget-s4",
      type: "sales-chart",
      title: "Sales Trends",
      description: "Weekly performance",
      size: "large",
      position: { x: 0, y: 1, width: 2, height: 2 },
      enabled: true,
      config: { chartType: "line", period: "week" },
      refreshInterval: "5m",
    },
  ],
};

/**
 * Available dashboard layouts
 */
export const dashboardLayouts: DashboardLayout[] = [
  defaultLayout,
  analyticsLayout,
  salesLayout,
];

/**
 * Default dashboard theme
 */
export const defaultTheme: DashboardTheme = {
  colorScheme: "auto",
  accentColor: "#4FBD9A",
  chartStyle: "default",
  cardStyle: "shadow",
  compactMode: false,
  animations: true,
  highContrast: false,
};

/**
 * Default quick actions
 */
export const defaultQuickActions: QuickAction[] = [
  {
    id: "qa-1",
    label: "Record Sale",
    icon: "ShoppingCart",
    action: "/sales",
    color: "#4FBD9A",
    enabled: true,
    order: 1,
  },
  {
    id: "qa-2",
    label: "Add Product",
    icon: "Plus",
    action: "/inventory/new",
    color: "#1F2B3C",
    enabled: true,
    order: 2,
    requiresPermission: ["owner"],
  },
  {
    id: "qa-3",
    label: "View Analytics",
    icon: "BarChart3",
    action: "/analytics",
    color: "#3B82F6",
    enabled: true,
    order: 3,
  },
  {
    id: "qa-4",
    label: "Check Alerts",
    icon: "Bell",
    action: "/notifications",
    color: "#F59E0B",
    enabled: true,
    order: 4,
  },
];

/**
 * User dashboard preferences
 */
export const userPreferences: DashboardPreferences = {
  userId: "user-1",
  defaultView: "layout-default",
  theme: defaultTheme,
  quickActions: defaultQuickActions,
  showWelcomeMessage: true,
  showTips: true,
  defaultDateRange: "week",
  autoRefresh: true,
  refreshInterval: "1m",
  notifications: {
    desktop: true,
    sound: false,
    inApp: true,
  },
};

/**
 * Saved dashboard views
 */
export const savedViews: SavedView[] = [
  {
    id: "view-1",
    name: "Morning Overview",
    description: "Quick morning check of key metrics",
    layoutId: "layout-default",
    filters: { period: "today" },
    dateRange: {
      start: new Date(2024, 0, 15, 0, 0),
      end: new Date(2024, 0, 15, 23, 59),
    },
    isDefault: false,
    createdAt: new Date(2024, 0, 10),
    userId: "user-1",
  },
  {
    id: "view-2",
    name: "Weekly Review",
    description: "Weekly performance analysis",
    layoutId: "layout-analytics",
    filters: { period: "week" },
    dateRange: {
      start: new Date(2024, 0, 8),
      end: new Date(2024, 0, 15),
    },
    isDefault: false,
    createdAt: new Date(2024, 0, 12),
    userId: "user-1",
  },
  {
    id: "view-3",
    name: "Sales Floor",
    description: "Active sales operations view",
    layoutId: "layout-sales",
    filters: { status: "active" },
    dateRange: {
      start: new Date(2024, 0, 15, 0, 0),
      end: new Date(2024, 0, 15, 23, 59),
    },
    isDefault: true,
    createdAt: new Date(2024, 0, 5),
    userId: "user-1",
  },
];

/**
 * Grid configuration
 */
export const gridConfig: GridConfig = {
  columns: 4,
  rows: 6,
  gap: 16,
  cellSize: {
    width: 300,
    height: 200,
  },
  responsive: {
    mobile: { columns: 1 },
    tablet: { columns: 2 },
    desktop: { columns: 4 },
  },
};
