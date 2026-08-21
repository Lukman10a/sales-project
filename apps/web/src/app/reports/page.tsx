"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateReportInput, ReportFormat, ReportTemplate } from "@/types/reportTypes";
import { reportTemplates } from "@/data/reports";
import { toast } from "@/components/ui/sonner";
import { useReports } from "@/hooks/useReports";
import TemplatesGrid from "@/components/reports/TemplatesGrid";
import ReportHistory from "@/components/reports/ReportHistory";
import ScheduledReports from "@/components/reports/ScheduledReports";
const GenerateReportDialog = dynamic(
  () => import("@/components/reports/GenerateReportDialog"),
  { ssr: false, loading: () => null },
);

export default function Reports() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isOwner } = usePermissions();
  const { t } = useLanguage();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    name: "",
    format: "pdf" as ReportFormat,
    dateStart: "",
    dateEnd: "",
    includeCategories: true,
    includeExpenses: true,
    includeStaff: true,
  });
  const {
    reports,
    isLoading: isLoadingReports,
    createReport,
    deleteReport,
  } = useReports();

  // Restrict reports to owners only (contains business figures and financial data)
  if (!isLoading && isAuthenticated && !isOwner()) {
    return (
      <AccessDenied
        message="Reports access is restricted to business owners. This page contains confidential financial reports and business analysis."
        requiredPermission="owner-access"
      />
    );
  }

  const handleSelectTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setGenerateForm({
      ...generateForm,
      name: template.name,
    });
    setIsGenerateOpen(true);
  };

  const resetGenerateForm = () => {
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

  const handleGenerateReport = async (input: CreateReportInput) => {
    setIsGenerating(true);
    try {
      await createReport(input);
      toast(t("Report generated successfully"));
      setIsGenerateOpen(false);
      setSelectedTemplate(null);
      resetGenerateForm();
    } catch {
      toast(t("Failed to generate report"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteReport = async (report: any) => {
    try {
      await deleteReport(report.id);
      toast(t("Report deleted"));
    } catch {
      toast(t("Failed to delete report"));
    }
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
            {isLoadingReports ? (
              <p className="text-sm text-muted-foreground">{t("Loading reports...")}</p>
            ) : (
              <ReportHistory reports={reports} onDelete={handleDeleteReport} />
            )}
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-4">
            <ScheduledReports reports={reports} />
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
        isSubmitting={isGenerating}
      />
    </>
  );
}