"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Insight } from "@/types/aiInsightTypes";

type TranslateOptions = {
  values?: Record<string, string | number>;
  fallback?: string;
};

type InsightCardProps = {
  insight: Insight;
  index: number;
  t: (key: string, options?: TranslateOptions) => string;
  priorityConfig: Record<string, { badge: string; border: string }>;
  typeIcons: Record<string, React.ComponentType<{ className?: string }>>;
};

export default function InsightCard({
  insight,
  index,
  t,
  priorityConfig,
  typeIcons,
}: InsightCardProps) {
  const Icon = typeIcons[insight.type];
  const config = priorityConfig[insight.priority];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "bg-card rounded-xl border border-l-4 p-6 shadow-sm hover:shadow-md transition-shadow",
        config.border,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-display font-semibold text-lg text-foreground tracking-tight">
              {t(insight.title)}
            </h3>
            <Badge className={config.badge}>
              {t(insight.priority.toUpperCase())}
            </Badge>
          </div>
          <p className="text-muted-foreground mb-4">{t(insight.description)}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("Impact")}
                </p>
                <p className="font-semibold text-success">{insight.impact}</p>
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
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t("Apply")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


