"use client";

import { Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Report } from "@/types/reportTypes";

interface ScheduledReportsProps {
  reports: Report[];
}

export default function ScheduledReports({ reports }: ScheduledReportsProps) {
  const { t } = useLanguage();
  const scheduled = reports.filter((report) => report.status === "scheduled");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground mb-2">
          {t("Scheduled Reports")}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("Automatically generate and email reports on a schedule")}
        </p>
      </div>
      {scheduled.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("No scheduled reports yet")}
        </p>
      ) : (
        <div className="space-y-3">
          {scheduled.map((report) => (
            <Card key={report.id} className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-foreground">
                        {report.name}
                      </h4>
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                      >
                        {t("Scheduled")}
                      </Badge>
                      <Badge variant="secondary">
                        {report.format.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(report.dateRange.start).toLocaleDateString()}{" "}
                        - {new Date(report.dateRange.end).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {t("by")} {report.createdByName ?? report.createdBy}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}