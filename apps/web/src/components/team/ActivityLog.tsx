"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useActivityLog } from "@/hooks/useActivityLog";

export default function ActivityLog() {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useActivityLog(1, 20);
  const logs = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border shadow-sm p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="mt-3 h-3 bg-muted/70 rounded w-2/3" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-card rounded-xl border shadow-sm p-4">
        <p className="text-sm text-destructive">Failed to load activity</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-foreground">{t("Recent Activity")}</h3>
          <p className="text-sm text-muted-foreground">{t("Track team member actions and changes")}</p>
        </div>
        <div className="p-4 text-sm text-muted-foreground">No activity yet</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-foreground">{t("Recent Activity")}</h3>
        <p className="text-sm text-muted-foreground">{t("Track team member actions and changes")}</p>
      </div>
      <div className="divide-y">
        {logs.map((log) => (
          <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-foreground">{log.userName}</p>
                <p className="text-sm text-muted-foreground">
                  {log.action} • {log.entity}
                </p>
                {log.details && (
                  <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
