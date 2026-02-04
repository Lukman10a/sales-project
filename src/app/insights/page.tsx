"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
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

const InsightCard = dynamic(() => import("@/components/insights/InsightCard"), {
  ssr: false,
  loading: () => null,
});

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
        {insights.map((insight: Insight, index: number) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            index={index}
            t={t}
            priorityConfig={priorityConfig}
            typeIcons={typeIcons}
          />
        ))}
      </div>
    </div>
  );
}
