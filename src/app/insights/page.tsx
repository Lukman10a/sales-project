"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/auth/AccessDenied";
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
  const { isAuthenticated, isLoading } = useAuth();
  const { isOwner } = usePermissions();
  const { t, formatCurrency } = useLanguage();

  // Restrict insights to owners only (contains business figures and AI-powered recommendations)
  if (!isLoading && isAuthenticated && !isOwner()) {
    return (
      <AccessDenied
        message="AI Insights access is restricted to business owners. This page contains AI-powered business intelligence and recommendations based on confidential business data."
        requiredPermission="owner-access"
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            {t("AI Insights")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("Smart recommendations to grow your business")}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gradient-accent px-3 sm:px-4 py-2 rounded-xl flex-shrink-0">
          <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-accent-foreground" />
          <span className="font-semibold text-accent-foreground text-xs sm:text-sm whitespace-nowrap">
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
