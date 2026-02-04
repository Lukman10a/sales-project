"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportFormat } from "@/types/reportTypes";
import { reports, scheduledReports, reportTemplates } from "@/data/reports";
import { toast } from "@/components/ui/sonner";
import TemplatesGrid from "@/components/reports/TemplatesGrid";
import ReportHistory from "@/components/reports/ReportHistory";
import ScheduledReports from "@/components/reports/ScheduledReports";
import GenerateReportDialog from "@/components/reports/GenerateReportDialog";

export default function Reports() {
  const { t } = useLanguage();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generateForm, setGenerateForm] = useState({
    name: "",
    format: "pdf" as ReportFormat,
    dateStart: "",
    dateEnd: "",
    includeCategories: true,
    includeExpenses: true,
    includeStaff: true,
  });

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template.id);
    setGenerateForm({
      ...generateForm,
      name: template.name,
    });
    setIsGenerateOpen(true);
  };

  const handleGenerateReport = () => {
    if (!selectedTemplate || !generateForm.name.trim()) {
      toast(t("Please fill in all required fields"));
      return;
    }

    toast(t("Report generation started..."));
    setIsGenerateOpen(false);
    setSelectedTemplate(null);
    setGenerateForm({
      name: "",
      format: "pdf",
      dateStart: "",
      dateEnd: "",
      includeCategories: true,
      includeExpenses: true,
      includeStaff: true,
    });
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              {t("Reports & Export")}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t("Generate custom reports and export your data")}
            </p>
          </div>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="templates">{t("Templates")}</TabsTrigger>
            <TabsTrigger value="history">{t("History")}</TabsTrigger>
            <TabsTrigger value="scheduled">{t("Scheduled")}</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <TemplatesGrid
              templates={reportTemplates}
              onSelectTemplate={handleSelectTemplate}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <ReportHistory reports={reports} />
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-4">
            <ScheduledReports scheduledReports={scheduledReports} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Generate Report Dialog */}
      <GenerateReportDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        selectedTemplate={selectedTemplate}
        form={generateForm}
        onFormChange={setGenerateForm}
        onSubmit={handleGenerateReport}
      />
    </>
  );
}
