"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { investorInsights } from "@/data/investorAiInsights";
import { useLanguage } from "@/contexts/LanguageContext";

const priorityColors = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
};

const typeIcons = {
  trending: TrendingUp,
  opportunity: Sparkles,
  warning: AlertCircle,
  pricing: TrendingUp,
  restock: AlertCircle,
};

export default function InvestorInsightsPage() {
  const { t } = useLanguage();

  const highPriorityCount = investorInsights.filter(
    (i) => i.priority === "high",
  ).length;

  const priorityLabel = {
    high: t("High Priority"),
    medium: t("Medium Priority"),
    low: t("Low Priority"),
  } as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("AI Investment Insights")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("Data-driven analysis of your investment performance")}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="w-5 h-5 text-accent-foreground" />
          <span className="text-sm font-medium text-accent-foreground">
            {t("{count} High Priority Insights", {
              values: { count: highPriorityCount },
            })}
          </span>
        </div>
      </motion.div>

      {/* Insights Grid */}
      <div className="grid gap-6">
        {investorInsights.map((insight, index) => {
          const Icon = typeIcons[insight.type];

          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <CardTitle className="text-xl">
                          {t(insight.title)}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={priorityColors[insight.priority]}
                        >
                          {priorityLabel[insight.priority]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    {t(insight.description)}
                  </p>

                  {/* Metrics */}
                  {insight.metrics && insight.metrics.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
                      {insight.metrics.map((metric, idx) => (
                        <div key={idx} className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {t(metric.label)}
                          </p>
                          <p className="text-lg font-semibold flex items-center gap-1">
                            {metric.value}
                            {metric.trend === "up" && (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            )}
                            {metric.trend === "down" && (
                              <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Impact & Action */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-dashed">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        {t("IMPACT")}
                      </p>
                      <p className="text-sm font-medium">{t(insight.impact)}</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        {t("RECOMMENDED ACTION")}
                      </p>
                      <p className="text-sm font-medium text-primary">
                        {t(insight.action)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <Card className="bg-primary text-primary-foreground border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-accent-foreground" />
            <div>
              <p className="font-medium text-accent-foreground">
                {t("AI Analysis Complete")}
              </p>
              <p className="text-sm text-accent-foreground/80">
                {t(
                  "These insights are generated based on your investment data, business financials, and market trends. Review regularly for optimal returns.",
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

