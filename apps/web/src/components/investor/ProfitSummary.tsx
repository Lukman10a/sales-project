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
import { TrendingUp, Target, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfitSummaryProps {
  dashboardData: InvestorDashboardData;
  investor: Investor;
}

export function ProfitSummary({ dashboardData, investor }: ProfitSummaryProps) {
  const { t } = useLanguage();
  const hasReachedBreakEven = dashboardData.breakEvenDate !== undefined;
  const daysToBreakEven = dashboardData.breakEvenDate
    ? Math.ceil(
        (new Date(dashboardData.breakEvenDate).getTime() -
          new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 font-display font-bold text-foreground tracking-tight">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t("Profit Summary")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ROI Percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("ROI Percentage")}
              </span>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary hover:bg-primary/20"
              >
                {formatPercentage(dashboardData.profitPercentage)}
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(dashboardData.profitPercentage, 100)}%`,
                }}
                transition={{ duration: 1, delay: 0.6 }}
                className="bg-primary h-2 rounded-full"
              />
            </div>
          </div>

          {/* Break-even Status */}
          <div className="pt-4 border-t border-border">
            <div className="space-y-2">
              {hasReachedBreakEven ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {t("Break-even Reached!")}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("Break-even Status")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("Recovery in progress")}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(
                      dashboardData.investmentAmount -
                        dashboardData.totalProfitAccrued,
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("Still to recover")}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Net Profit */}
          <div className="pt-4 border-t border-border bg-primary/5 px-4 py-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {t("Your Total Earnings")}
              </span>
              <div className="text-right">
                <div className="text-xl font-bold font-display tracking-tight text-primary">
                  {formatCurrency(dashboardData.totalProfitAccrued)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("{share} share", {
                    values: {
                      share: formatPercentage(
                        dashboardData.percentageOwnership,
                      ),
                    },
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}


