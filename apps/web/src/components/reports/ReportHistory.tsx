"use client";

import { Download, Calendar, Clock, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/components/ui/sonner";
import { formatIcons, statusConfig } from "./reportConfig";
import { downloadReportCsv } from "@/lib/reportsExportUtils";
import { Report } from "@/types/reportTypes";

interface ReportHistoryProps {
  reports: Report[];
  onDelete?: (report: Report) => void;
}

export default function ReportHistory({ reports, onDelete }: ReportHistoryProps) {
  const { t } = useLanguage();

  const handleDownload = (report: Report) => {
    if (report.snapshot) {
      downloadReportCsv(report);
    } else {
      toast(t("Report is still being generated"));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground mb-2">
          {t("Report History")}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("View and download your previously generated reports")}
        </p>
      </div>
      <div className="space-y-3">
        {reports.map((report) => {
          const FormatIcon = formatIcons[report.format];
          return (
            <Card key={report.id} className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-muted">
                      <FormatIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground truncate">
                          {report.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className={statusConfig[report.status].className}
                        >
                          {t(statusConfig[report.status].label)}
                        </Badge>
                      </div>
                      {report.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {report.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(
                            report.dateRange.start,
                          ).toLocaleDateString()}{" "}
                          -{" "}
                          {new Date(report.dateRange.end).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(report.createdAt).toLocaleString()}
                        </span>
                        <span>
                          {t("by")} {report.createdByName ?? report.createdBy}
                        </span>
                        {report.fileSize && <span>{report.fileSize}</span>}
                      </div>
                    </div>
                  </div>
                  {report.status === "completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(report)}
                      className="w-full sm:w-auto"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t("Download")}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(report)}
                      aria-label={t("Delete")}
                      className="w-full sm:w-auto text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("Delete")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


