"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FinancialRecord, Investor } from "@/types/investorTypes";
import { formatCurrency } from "@/lib/investorUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfitChartProps {
  financialRecords: FinancialRecord[];
  investor: Investor;
}

export function ProfitChart({ financialRecords, investor }: ProfitChartProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "ar" ? "ar-EG" : "en-NG";

  // Prepare chart data
  const chartData = financialRecords.map((record) => {
    const investorShare = record.netProfit * investor.percentageOwnership;
    return {
      month: new Date(record.date).toLocaleDateString(dateLocale, {
        month: "short",
        year: "2-digit",
      }),
      "Your Share": investorShare,
      "Total Profit": record.netProfit,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle>{t("Profit Trend")}</CardTitle>
          <CardDescription>
            {t("Monthly breakdown of total profit and your share")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  color: "hsl(var(--foreground))",
                  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Legend />
              <Bar
                dataKey="Your Share"
                name={t("Your Share")}
                fill="hsl(160, 60%, 45%)"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="Total Profit"
                name={t("Total Profit")}
                fill="#06B6D4"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">
                {t("Average Monthly")}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(
                  chartData.reduce((sum, d) => sum + d["Your Share"], 0) /
                    chartData.length,
                )}
              </p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">
                {t("Highest Month")}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(
                  Math.max(...chartData.map((d) => d["Your Share"])),
                )}
              </p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">
                {t("Total 4-Month")}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(
                  chartData.reduce((sum, d) => sum + d["Your Share"], 0),
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}


