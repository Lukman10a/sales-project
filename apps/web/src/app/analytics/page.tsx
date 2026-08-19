"use client";

import { useMemo, useState } from "react";
import dynamicImport from "next/dynamic";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useAnalytics } from "@/hooks/useAnalytics";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AnalyticsPeriod } from "@/lib/api/types";
import type {
  AnalyticsCategoryDatum,
  AnalyticsTopProductDatum,
} from "@/components/analytics/AnalyticsCharts";

const AnalyticsCharts = dynamicImport(
  () => import("@/components/analytics/AnalyticsCharts"),
  {
    loading: () => (
      <div className="h-[520px] bg-card rounded-xl border shadow-sm animate-pulse" />
    ),
    ssr: false,
  },
);

const Analytics = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { canViewReports } = usePermissions();
  const [dateRange, setDateRange] = useState<AnalyticsPeriod>("week");

  // Restrict analytics to owners and managers (coarse access gate) before
  // any data hook mounts, so apprentices never fire analytics API calls.
  if (!isLoading && isAuthenticated && !canViewReports()) {
    return (
      <AccessDenied
        message="Analytics access is restricted to business owners and managers. This page contains detailed performance metrics and financial analysis."
        requiredPermission="owner-or-manager-access"
      />
    );
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return <AnalyticsContent dateRange={dateRange} onDateRangeChange={setDateRange} />;
};

const AnalyticsContent = ({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: AnalyticsPeriod;
  onDateRangeChange: (range: AnalyticsPeriod) => void;
}) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { t, formatCurrency } = useLanguage();

  const analytics = useAnalytics(dateRange);

  const summary = analytics.summary.data;

  const currentChartData = useMemo(() => {
    const chartBuckets = analytics.salesChart.data?.buckets ?? [];
    return chartBuckets.map((bucket) => ({
      [dateRange === "today" ? "time" : "day"]: bucket.label,
      sales: bucket.revenue,
      orders: bucket.orders,
    }));
  }, [analytics.salesChart.data, dateRange]);

  const chartTitle =
    dateRange === "today"
      ? t("Today's Performance")
      : dateRange === "month"
        ? t("Monthly Performance")
        : t("Weekly Performance");

  const xAxisKey = dateRange === "today" ? "time" : "day";

  const areaChartTitle =
    dateRange === "today"
      ? t("Today's Sales Trend")
      : dateRange === "month"
        ? t("Monthly Sales Trend")
        : t("Weekly Sales Trend");

  const formatCompact = (value: number) =>
    formatCurrency(value, {
      notation: "compact",
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    });

  const formatAxisCurrency = (value: number) =>
    formatCurrency(value, {
      notation: value >= 100000 ? "compact" : "standard",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });

  const totalRevenue = summary?.current.revenue ?? 0;
  const totalOrders = summary?.current.orders ?? 0;
  const netProfit = summary?.current.netProfit ?? 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const categoryData: AnalyticsCategoryDatum[] = (
    analytics.categoryBreakdown.data?.data ?? []
  ).map((row) => ({ name: row.category, value: row.revenue }));

  const topProducts: AnalyticsTopProductDatum[] = (
    analytics.topProducts.data?.data ?? []
  ).map((row) => ({ name: row.name, sold: row.units, revenue: row.revenue }));

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            {t("Analytics")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("Track your business performance and insights")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-shrink-0">
          <div className="flex items-center border rounded-lg p-1 bg-card w-full sm:w-auto">
            {(["today", "week", "month"] as const).map((range) => (
              <button
                key={range}
                onClick={() => onDateRangeChange(range)}
                className={cn(
                  "px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors capitalize flex-1 sm:flex-none",
                  dateRange === range
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(
                  range === "today"
                    ? "Today"
                    : range === "week"
                      ? "Week"
                      : "Month",
                )}
              </button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
              >
                <CalendarIcon className="w-4 h-4" />
                <span className="truncate">
                  {date ? format(date, "MMM d") : t("Pick date")}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border shadow-sm p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
              <DollarSign className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
            </div>
            <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-success">
              <TrendingUp className="w-3 h-3" />
              <span>+{summary?.trends.revenueChange ?? 0}%</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">
            {t("Total Revenue")}
          </p>
          <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
            {formatCompact(totalRevenue)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border shadow-sm p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 sm:p-3 rounded-lg bg-success/10">
              <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5 text-success" />
            </div>
            <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-success">
              <TrendingUp className="w-3 h-3" />
              <span>+{summary?.trends.netProfitChange ?? 0}%</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">
            {t("Net Profit")}
          </p>
          <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
            {formatCompact(netProfit)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border shadow-sm p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
              <ShoppingCart className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
            </div>
            <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-destructive">
              <TrendingDown className="w-3 h-3" />
              <span>{summary?.trends.ordersChange ?? 0}%</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">
            {t("Total Orders")}
          </p>
          <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
            {totalOrders}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border shadow-sm p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 sm:p-3 rounded-lg bg-warning/10">
              <Package className="w-4 sm:w-5 h-4 sm:h-5 text-warning" />
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">
            {t("Avg Order Value")}
          </p>
          <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
            {formatCurrency(avgOrderValue)}
          </p>
        </motion.div>
      </div>

      <AnalyticsCharts
        chartTitle={chartTitle}
        currentChartData={currentChartData}
        xAxisKey={xAxisKey}
        areaChartTitle={areaChartTitle}
        formatAxisCurrency={formatAxisCurrency}
        formatCurrency={formatCurrency}
        t={t}
        dateRange={dateRange}
        categoryData={categoryData}
        topProducts={topProducts}
      />
    </div>
  );
};

export default Analytics;