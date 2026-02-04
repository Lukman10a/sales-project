"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
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
  categoryData,
  topProducts,
  dailyAnalyticsData,
  monthlyAnalyticsData,
} from "@/data/analytics";
import { useLanguage } from "@/contexts/LanguageContext";

const CustomTooltip = ({ active, payload, label, formatCurrency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Sales Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border card-elevated p-6"
        >
          <h3 className="font-display font-semibold text-lg text-foreground mb-6">
            {chartTitle}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentChartData} key={dateRange}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey={xAxisKey}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 12,
                  }}
                  tickFormatter={formatAxisCurrency}
                />
                <Tooltip
                  content={<CustomTooltip formatCurrency={formatCurrency} />}
                />
                <Legend formatter={(value: string) => t(value)} />
                <Bar
                  dataKey="sales"
                  name={t("Sales")}
                  fill="hsl(230, 45%, 50%)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="profit"
                  name={t("Profit")}
                  fill="hsl(160, 60%, 45%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Hourly Sales Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border card-elevated p-6"
        >
          <h3 className="font-display font-semibold text-lg text-foreground mb-6">
            {areaChartTitle}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartData} key={dateRange}>
                <defs>
                  <linearGradient
                    id="salesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(160, 60%, 45%)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(160, 60%, 45%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey={areaChartXAxisKey}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 12,
                  }}
                  tickFormatter={formatAxisCurrency}
                />
                <Tooltip
                  content={<CustomTooltip formatCurrency={formatCurrency} />}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name={t("Sales")}
                  stroke="hsl(160, 60%, 45%)"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl border card-elevated p-6"
        >
          <h3 className="font-display font-semibold text-lg text-foreground mb-6">
            {t("Sales by Category")}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {t(cat.name)}
                </span>
                <span className="text-sm font-medium ml-auto">
                  {cat.value}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl border card-elevated p-6 lg:col-span-2"
        >
          <h3 className="font-display font-semibold text-lg text-foreground mb-6">
            {t("Top Performing Products")}
          </h3>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div
                key={product.name}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary text-sm">
                      #{index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {product.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {product.sold} {t("units sold")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {formatCurrency(product.revenue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("revenue")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
