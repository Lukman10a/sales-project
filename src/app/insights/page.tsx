"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Package,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { insights } from "@/data/aiInsight";
import { Insight } from "@/types/aiInsightTypes";
import { cn } from "@/lib/utils";

const priorityConfig = {
  high: {
    badge: "bg-destructive text-destructive-foreground",
    border: "border-l-destructive",
  },
  medium: {
    badge: "bg-warning text-warning-foreground",
    border: "border-l-warning",
  },
  low: {
    badge: "bg-primary/10 text-primary",
    border: "border-l-primary",
  },
};

const typeIcons = {
  restock: Package,
  trending: TrendingUp,
  warning: AlertTriangle,
  pricing: DollarSign,
  opportunity: Sparkles,
};

export default function Insights() {
  const { t, formatCurrency } = useLanguage();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {t("AI Insights")}
          </h1>
          <p className="text-muted-foreground">
            {t("Smart recommendations to grow your business")}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gradient-accent px-4 py-2 rounded-xl">
          <Sparkles className="w-5 h-5 text-accent-foreground" />
          <span className="font-semibold text-accent-foreground text-sm">
            {insights.length} {t("Active Insights")}
          </span>
        </div>
      </div>

      <div className="grid gap-4">
        {insights.map((insight: Insight, index: number) => {
          const Icon = typeIcons[insight.type];
          const config = priorityConfig[insight.priority];
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "bg-card rounded-2xl border-l-4 p-6 card-elevated card-hover",
                config.border,
              )}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-display font-semibold text-lg text-foreground">
                      {t(insight.title)}
                    </h3>
                    <Badge className={config.badge}>
                      {t(insight.priority.toUpperCase())}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {t(insight.description)}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("Impact")}
                        </p>
                        <p className="font-semibold text-success">
                          {insight.impact}
                        </p>
                      </div>
                      {insight.metrics && insight.metrics.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {t("Metric")}
                          </p>
                          <p className="font-semibold text-foreground">
                            {insight.metrics[0].value}
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-accent text-accent-foreground"
                    >
                      {t("Apply")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
