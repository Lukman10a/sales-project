import { roundCurrency } from "./currency";
import type {
  DashboardResponse,
  DashboardMetrics,
  DashboardTopProduct,
  DashboardRecentSale,
} from "@/lib/api/types";

export interface DashboardData {
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    netProfit: number;
    todayRevenue: number;
    todayOrders: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  inventory: {
    totalProducts: number;
    byStatus: Record<string, number>;
    lowStockItems: Array<Record<string, unknown>>;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    units: number;
    revenue: number;
  }>;
  recentSales: Array<{
    id: string;
    total: number;
    status: string;
    saleDate: string;
    customerName?: string;
    paymentMethod: string;
  }>;
}

function toMetrics(metrics: DashboardMetrics) {
  return {
    totalRevenue: roundCurrency(metrics.totalRevenue),
    totalOrders: metrics.totalOrders,
    netProfit: roundCurrency(metrics.netProfit),
    todayRevenue: roundCurrency(metrics.todayRevenue),
    todayOrders: metrics.todayOrders,
    lowStockCount: metrics.lowStockCount,
    outOfStockCount: metrics.outOfStockCount,
  };
}

function toTopProducts(products: DashboardTopProduct[]) {
  return products.map((product) => ({
    productId: product.productId,
    name: product.name,
    units: product.units,
    revenue: roundCurrency(product.revenue),
  }));
}

function toRecentSales(sales: DashboardRecentSale[]) {
  return sales.map((sale) => ({
    id: sale.id,
    total: roundCurrency(sale.total),
    status: sale.status,
    saleDate: new Date(sale.saleDate).toISOString(),
    customerName: sale.customerName,
    paymentMethod: sale.paymentMethod,
  }));
}

export function toDashboard(data: DashboardResponse): DashboardData {
  return {
    metrics: toMetrics(data.metrics),
    inventory: {
      totalProducts: data.inventory.totalProducts,
      byStatus: data.inventory.byStatus,
      lowStockItems: data.inventory.lowStockItems ?? [],
    },
    topProducts: toTopProducts(data.topProducts),
    recentSales: toRecentSales(data.recentSales),
  };
}