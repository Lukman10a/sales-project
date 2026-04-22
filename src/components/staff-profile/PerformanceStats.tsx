"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, ShoppingCart, Package, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

interface PerformanceStatsProps {
  stats?: Stat[];
}

export default function PerformanceStats({ stats }: PerformanceStatsProps) {
  const { t } = useLanguage();

  const defaultStats: Stat[] = [
    {
      label: "Items Sold Today",
      value: "24",
      icon: ShoppingCart,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Stock Confirmations",
      value: "12",
      icon: Package,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Accuracy Rate",
      value: "98.5%",
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  const displayStats = stats || defaultStats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {displayStats.map((stat) => (
        <Card key={stat.label} className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t(stat.label)}</p>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


