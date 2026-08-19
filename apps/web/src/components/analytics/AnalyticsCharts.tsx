"use client";

import { motion } from "framer-motion";
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

const CATEGORY_COLORS = [
  "hsl(160, 60%, 45%)",
  "hsl(230, 45%, 50%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
];

type TranslateOptions = {
  values?: Record<string, string | number>;
  fallback?: string;
};

export interface AnalyticsCategoryDatum {
  name: string;
  value: number;
  color?: string;
}

export interface AnalyticsTopProductDatum {
  name: string;
  sold: number;
  revenue: number;
}

type AnalyticsChartsProps = {
  chartTitle: string;
  currentChartData: Array<Record<string, any>>;
  xAxisKey: string;
  areaChartTitle: string;
  formatAxisCurrency: (value: number) => string;
  formatCurrency: (value: number) => string;
  t: (key: string, options?: TranslateOptions) => string;
  dateRange: string;
  categoryData?: AnalyticsCategoryDatum[];
  topProducts?: AnalyticsTopProductDatum[];
};

const CustomTooltip = ({ active, payload, label, formatCurrency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-sm">
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

export default function AnalyticsCharts({
  chartTitle,
  currentChartData,
  xAxisKey,
  areaChartTitle,
  formatAxisCurrency,
  formatCurrency,
  t,
  dateRange,
  categoryData = [],
  topProducts = [],
}: AnalyticsChartsProps) {
  return (
    <>
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Sales Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border shadow-sm p-6"
        >
          <h3 className="font-display font-semibold text-lg text-foreground tracking-tight mb-6">
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
                  dataKey="orders"
                  name={t("Orders")}
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
          className="bg-card rounded-xl border shadow-sm p-6"
        >
          <h3 className="font-display font-semibold text-lg text-foreground tracking-tight mb-6">
            {areaChartTitle}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentChartData} key={dateRange}>
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
          className="bg-card rounded-xl border shadow-sm p-6"
        >
          <h3 className="font-display font-semibold text-lg text-foreground tracking-tight mb-6">
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
                  nameKey="name"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color ?? CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {categoryData.map((cat, index) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      cat.color ?? CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  {t(cat.name)}
                </span>
                <span className="text-sm font-medium ml-auto">
                  {formatCurrency(cat.value)}
                </span>
              </div>
            ))}
            {categoryData.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                {t("No category data yet")}
              </p>
            )}
          </div>
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-xl border shadow-sm p-6 lg:col-span-2"
        >
          <h3 className="font-display font-semibold text-lg text-foreground tracking-tight mb-6">
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
            {topProducts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("No product data yet")}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}


