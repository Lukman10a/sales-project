export interface ApiEnvelope<T> {
  data: T;
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiErrorBody {
  message: string | string[];
  error?: string;
  statusCode?: number;
  errors?: Array<{ field?: string; message: string }>;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  businessName: string;
  businessId: string;
  role: string;
  avatar?: string;
  staffRole?: string;
  permissions?: string[];
}

export interface AuthResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}

export interface SalesSummary {
  totalSales: number;
  totalTransactions: number;
  averageTransaction: number;
}

// GET /sales adds `summary` on top of the standard envelope
export interface SalesListEnvelope<T> extends ApiEnvelope<T[]> {
  summary: SalesSummary;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

// GET /auth/me returns the full user shape (id, email, firstName, lastName,
// businessName, businessId, role, avatar, staffRole)
export type MeResponse = AuthUser;

export type AnalyticsPeriod = "today" | "week" | "month";

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  netProfit: number;
  todayRevenue: number;
  todayOrders: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface DashboardTopProduct {
  productId: string;
  name: string;
  units: number;
  revenue: number;
}

export interface DashboardRecentSale {
  id: string;
  total: number;
  status: string;
  saleDate: Date | string;
  customerName?: string;
  paymentMethod: string;
}

export interface DashboardResponse {
  metrics: DashboardMetrics;
  inventory: {
    totalProducts: number;
    byStatus: Record<string, number>;
    lowStockItems: Array<Record<string, unknown>>;
  };
  topProducts: DashboardTopProduct[];
  recentSales: DashboardRecentSale[];
}

export interface AnalyticsSummaryRow {
  revenue: number;
  orders: number;
  netProfit: number;
}

export interface AnalyticsSummaryResponse {
  period: AnalyticsPeriod;
  current: AnalyticsSummaryRow;
  previous: AnalyticsSummaryRow;
  trends: {
    revenueChange: number;
    ordersChange: number;
    netProfitChange: number;
  };
}

export interface AnalyticsChartBucket {
  label: string;
  from: string;
  to: string;
  revenue: number;
  orders: number;
}

export interface AnalyticsSalesChartResponse {
  period: AnalyticsPeriod;
  unit: "hour" | "day" | "week";
  buckets: AnalyticsChartBucket[];
}

export interface AnalyticsCategoryRow {
  category: string;
  units: number;
  revenue: number;
  orders: number;
}

export interface AnalyticsCategoryBreakdownResponse {
  period: AnalyticsPeriod;
  data: AnalyticsCategoryRow[];
}

export interface AnalyticsTopProductRow {
  productId: string;
  name: string;
  units: number;
  revenue: number;
}

export interface AnalyticsTopProductsResponse {
  period: AnalyticsPeriod;
  data: AnalyticsTopProductRow[];
}