import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  Package,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

interface Insight {
  id: string;
  type: "restock" | "trending" | "warning" | "suggestion";
  title: string;
  description: string;
  action?: string;
}

const insights: Insight[] = [
  {
    id: "1",
    type: "restock",
    title: "Restock iPhone Chargers",
    description:
      "Based on sales velocity, you'll run out in 2 days. Order now to maintain stock.",
    action: "Order Now",
  },
  {
    id: "2",
    type: "trending",
    title: "Wireless Earbuds are Hot!",
    description:
      "Sales up 45% this week. Consider increasing stock and promoting.",
    action: "View Details",
  },
  {
    id: "3",
    type: "warning",
    title: "Slow Moving: Laptop Sleeves",
    description:
      "Only 2 sold in 30 days. Consider price reduction or bundle deals.",
    action: "Adjust Pricing",
  },
];

const typeConfig = {
  restock: {
    icon: Package,
    bgClass: "bg-accent/10",
    iconClass: "text-accent",
    borderClass: "border-accent/20",
  },
  trending: {
    icon: TrendingUp,
    bgClass: "bg-success/10",
    iconClass: "text-success",
    borderClass: "border-success/20",
  },
  warning: {
    icon: AlertCircle,
    bgClass: "bg-warning/10",
    iconClass: "text-warning",
    borderClass: "border-warning/20",
  },
  suggestion: {
    icon: Sparkles,
    bgClass: "bg-primary/10",
    iconClass: "text-primary",
    borderClass: "border-primary/20",
  },
};

const AIInsightCard = () => {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="bg-card rounded-xl border p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground tracking-tight">
              {t("AI Insights")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("Smart recommendations for your business")}
            </p>
          </div>
        </div>
        <Link
          href="/insights"
          className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
        >
          {t("View All")}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {insights.map((insight, index) => {
          const config = typeConfig[insight.type];
          const Icon = config.icon;
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              className={cn(
                "p-4 rounded-xl border",
                config.bgClass,
                config.borderClass,
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg", config.bgClass)}>
                  <Icon className={cn("w-4 h-4", config.iconClass)} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-1">
                    {t(insight.title)}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t(insight.description)}
                  </p>
                  {insight.action && (
                    <button className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent/80 transition-colors">
                      {t(insight.action)}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AIInsightCard;


