import { motion } from "framer-motion";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSalesChart } from "@/hooks/useSalesChart";
import { cn } from "@/lib/utils";
import type { AnalyticsPeriod } from "@/lib/api/types";

const CustomTooltip = ({ active, payload, label, formatCurrency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground mb-1">
          {label}
        </p>
        <p className="text-lg font-bold text-foreground">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const SalesChart = () => {
  const { t, formatCurrency } = useLanguage();
  const [period, setPeriod] = useState<AnalyticsPeriod>("week");
  const { data: salesChart } = useSalesChart(period);

  const chartData = (salesChart?.buckets ?? []).map((bucket) => ({
    time: bucket.label,
    sales: bucket.revenue,
  }));

  const chartTitle =
    period === "today"
      ? t("Today's Sales")
      : period === "week"
        ? t("This Week's Sales")
        : t("This Month's Sales");

  const chartSubtitle =
    period === "today"
      ? t("Hourly breakdown")
      : period === "week"
        ? t("Daily breakdown")
        : t("Weekly breakdown");

  const formatCompactCurrency = (value: number) =>
    formatCurrency(value, {
      notation: value >= 100000 ? "compact" : "standard",
      compactDisplay: "short",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-card rounded-xl border p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground tracking-tight">
            {chartTitle}
          </h3>
          <p className="text-sm text-muted-foreground">{chartSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {(["today", "week", "month"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setPeriod(range)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                period === range
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} key={period}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
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
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={formatCompactCurrency}
            />
            <Tooltip
              content={<CustomTooltip formatCurrency={formatCurrency} />}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="hsl(160, 60%, 45%)"
              strokeWidth={2}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default SalesChart;