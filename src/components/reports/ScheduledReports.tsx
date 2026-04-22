"use client";

import { Clock, Calendar, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScheduledReport } from "@/types/reportTypes";

interface ScheduledReportsProps {
  scheduledReports: ScheduledReport[];
}

export default function ScheduledReports({
  scheduledReports,
}: ScheduledReportsProps) {
  const { t } = useLanguage();

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
      <div className="space-y-3">
        {scheduledReports.map((schedule) => (
          <Card key={schedule.id} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-foreground">
                      {schedule.reportName}
                    </h4>
                    <Badge
                      variant="outline"
                      className={
                        schedule.active
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-muted text-muted-foreground border-muted"
                      }
                    >
                      {schedule.active ? t("Active") : t("Paused")}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {t(
                        schedule.frequency.charAt(0).toUpperCase() +
                          schedule.frequency.slice(1),
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {t("Next run")}:{" "}
                      {new Date(schedule.nextRun).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {schedule.recipients.length} {t("recipients")}
                    </span>
                    <Badge variant="secondary">
                      {schedule.format.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    {t("Edit")}
                  </Button>
                  <Button variant="outline" size="sm">
                    {schedule.active ? t("Pause") : t("Resume")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


