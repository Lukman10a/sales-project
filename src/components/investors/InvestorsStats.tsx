"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Investor, FinancialRecord } from "@/types/investorTypes";
import {
  formatCurrency,
  calculateInvestorTotalProfit,
} from "@/lib/investorUtils";
import { Users, DollarSign, TrendingUp, PieChart } from "lucide-react";
import { motion } from "framer-motion";

interface InvestorsStatsProps {
  investors: Investor[];
  financialRecords: FinancialRecord[];
}

export function InvestorsStats({
  investors,
  financialRecords,
}: InvestorsStatsProps) {
  const totalInvestment = investors.reduce(
    (sum, inv) => sum + inv.investmentAmount,
    0,
  );

  const totalProfitAccrued = investors.reduce((sum, inv) => {
    const investorProfit = calculateInvestorTotalProfit(inv, financialRecords);
    return sum + investorProfit;
  }, 0);

  const activeInvestors = investors.filter(
    (inv) => inv.status === "active",
  ).length;
  const totalOwnershipDistributed = investors.reduce(
    (sum, inv) => sum + inv.percentageOwnership,
    0,
  );

  const stats = [
    {
      title: "Active Investors",
      value: activeInvestors.toString(),
      description: `${investors.length} total`,
      icon: Users,
      variant: "default" as const,
      delay: 0,
    },
    {
      title: "Total Invested",
      value: formatCurrency(totalInvestment),
      description: "Capital from all investors",
      icon: DollarSign,
      variant: "accent" as const,
      delay: 0.1,
    },
    {
      title: "Total Profit Accrued",
      value: formatCurrency(totalProfitAccrued),
      description: "Cumulative earnings",
      icon: TrendingUp,
      variant: "accent" as const,
      delay: 0.2,
    },
    {
      title: "Ownership Distributed",
      value: `${(totalOwnershipDistributed * 100).toFixed(1)}%`,
      description: "Total equity given out",
      icon: PieChart,
      variant: "default" as const,
      delay: 0.3,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
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


