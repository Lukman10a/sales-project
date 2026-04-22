"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Investor, InvestorDashboardData } from "@/types/investorTypes";
import { formatCurrency, formatPercentage } from "@/lib/investorUtils";
import { DollarSign, TrendingUp, Calendar, Percent } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface InvestmentOverviewProps {
  investor: Investor;
  dashboardData: InvestorDashboardData;
}

export function InvestmentOverview({
  investor,
  dashboardData,
}: InvestmentOverviewProps) {
  const { t, language } = useLanguage();

  const dateLocale = language === "ar" ? "ar-EG" : "en-NG";

  const statCards = [
    {
      title: t("Investment Amount"),
      value: formatCurrency(dashboardData.investmentAmount),
      description: t("Initial capital invested"),
      icon: DollarSign,
      variant: "default" as const,
      delay: 0,
    },
    {
      title: t("Ownership"),
      value: formatPercentage(dashboardData.percentageOwnership),
      description: t("{value} of business equity", {
        values: { value: formatPercentage(dashboardData.percentageOwnership) },
      }),
      icon: Percent,
      variant: "accent" as const,
      delay: 0.1,
    },
    {
      title: t("Total Profit Accrued"),
      value: formatCurrency(dashboardData.totalProfitAccrued),
      description: t("Cumulative profit earned"),
      icon: TrendingUp,
      variant: "accent" as const,
      delay: 0.2,
    },
    {
      title: t("Investment Date"),
      value: new Date(dashboardData.dateInvested).toLocaleDateString(
        dateLocale,
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        },
      ),
      description: t("When you invested"),
      icon: Calendar,
      variant: "default" as const,
      delay: 0.3,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: stat.delay }}
        >
          <Card
            className={`shadow-sm border rounded-xl ${
              stat.variant === "accent" ? "bg-primary/5 border-primary/20" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon
                className={`w-4 h-4 ${stat.variant === "accent" ? "text-primary" : "text-muted-foreground"}`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold text-foreground tracking-tight">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}


