"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { activityLogs } from "@/data/team";

export default function ActivityLog() {
  const { t } = useLanguage();

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-foreground">
          {t("Recent Activity")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("Track team member actions and changes")}
        </p>
      </div>
      <div className="divide-y">
        {activityLogs.map((log) => (
          <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-foreground">{log.userName}</p>
                <p className="text-sm text-muted-foreground">
                  {log.action} • {log.entity}
                </p>
                {log.details && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {log.details}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
                {log.ipAddress && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {log.ipAddress}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


