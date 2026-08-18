"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { TeamStats } from "./teamConfig";

interface StatsGridProps {
  stats: TeamStats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-card rounded-xl border p-3 sm:p-4 shadow-sm">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("Total Members")}
        </p>
        <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
          {stats.total}
        </p>
      </div>
      <div className="bg-card rounded-xl border p-3 sm:p-4 shadow-sm">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("Active")}
        </p>
        <p className="text-xl sm:text-2xl font-display font-bold text-success">
          {stats.active}
        </p>
      </div>
      <div className="bg-card rounded-xl border p-3 sm:p-4 shadow-sm">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("Invited")}
        </p>
        <p className="text-xl sm:text-2xl font-display font-bold text-warning">
          {stats.invited}
        </p>
      </div>
      <div className="bg-card rounded-xl border p-3 sm:p-4 shadow-sm">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("Inactive")}
        </p>
        <p className="text-xl sm:text-2xl font-display font-bold text-muted-foreground">
          {stats.inactive}
        </p>
      </div>
    </div>
  );
}


