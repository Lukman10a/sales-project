"use client";

import { useState } from "react";
import dynamicImport from "next/dynamic";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
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
import {
  salesData,
  dailyAnalyticsData,
  monthlyAnalyticsData,
} from "@/data/analytics";
import { useLanguage } from "@/contexts/LanguageContext";

const AnalyticsCharts = dynamicImport(
  () => import("@/components/analytics/AnalyticsCharts"),
  {
    loading: () => (
      <div className="h-[520px] bg-card rounded-2xl border card-elevated animate-pulse" />
    ),
    ssr: false,
  },
);

const Analytics = () => {
  const [dateRange, setDateRange] = useState<
    "today" | "week" | "month" | "custom"
  >("week");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { t, formatCurrency } = useLanguage();

  // Get the appropriate data based on selected period
  const currentChartData =
    dateRange === "today"
      ? dailyAnalyticsData
      : dateRange === "month"
        ? monthlyAnalyticsData
        : salesData;

  const chartTitle =
    dateRange === "today"
      ? t("Today's Performance")
      : dateRange === "month"
        ? t("Monthly Performance")
        : t("Weekly Performance");

  const xAxisKey =
    dateRange === "today" ? "time" : dateRange === "month" ? "time" : "day";

  // Get data for area chart
  const areaChartData =
    dateRange === "today"
      ? dailyAnalyticsData
      : dateRange === "month"
        ? monthlyAnalyticsData
        : salesData;

  const areaChartTitle =
    dateRange === "today"
      ? t("Today's Sales Trend")
      : dateRange === "month"
        ? t("Monthly Sales Trend")
        : t("Weekly Sales Trend");

  const areaChartXAxisKey =
    dateRange === "today" ? "time" : dateRange === "month" ? "time" : "day";

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {t("Analytics")}
          </h1>
          <p className="text-muted-foreground">
            {t("Track your business performance and insights")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1 bg-card">
            {(["today", "week", "month"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize",
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
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {date ? format(date, "MMM d, yyyy") : t("Pick date")}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border card-elevated p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-accent/10">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-success">
              <TrendingUp className="w-3 h-3" />
              <span>+18.2%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            {t("Total Revenue")}
          </p>
          <p className="text-3xl font-display font-bold text-foreground">
            {formatCompact(3650000)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border card-elevated p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-success/10">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-success">
              <TrendingUp className="w-3 h-3" />
              <span>+12.5%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            {t("Net Profit")}
          </p>
          <p className="text-3xl font-display font-bold text-foreground">
            {formatCompact(784000)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border card-elevated p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-destructive">
              <TrendingDown className="w-3 h-3" />
              <span>-2.4%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            {t("Total Orders")}
          </p>
          <p className="text-3xl font-display font-bold text-foreground">391</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border card-elevated p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-warning/10">
              <Package className="w-5 h-5 text-warning" />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-success">
              <TrendingUp className="w-3 h-3" />
              <span>+5.8%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            {t("Avg Order Value")}
          </p>
          <p className="text-3xl font-display font-bold text-foreground">
            {formatCurrency(9340)}
          </p>
        </motion.div>
      </div>

      <AnalyticsCharts
        chartTitle={chartTitle}
        currentChartData={currentChartData}
        xAxisKey={xAxisKey}
        areaChartTitle={areaChartTitle}
        areaChartData={areaChartData}
        areaChartXAxisKey={areaChartXAxisKey}
        formatAxisCurrency={formatAxisCurrency}
        formatCurrency={formatCurrency}
        t={t}
        dateRange={dateRange}
      />
    </div>
  );
};

export default Analytics;
