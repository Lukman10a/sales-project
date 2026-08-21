"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  CreateReportInput,
  ReportFormat,
  ReportTemplate,
} from "@/types/reportTypes";

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTemplate: ReportTemplate | null;
  form: {
    name: string;
    format: ReportFormat;
    dateStart: string;
    dateEnd: string;
    includeCategories: boolean;
    includeExpenses: boolean;
    includeStaff: boolean;
  };
  onFormChange: (form: any) => void;
  onSubmit: (input: CreateReportInput) => Promise<void>;
  isSubmitting?: boolean;
}

export default function GenerateReportDialog({
  open,
  onOpenChange,
  selectedTemplate,
  form,
  onFormChange,
  onSubmit,
  isSubmitting = false,
}: GenerateReportDialogProps) {
  const { t } = useLanguage();

  const handleGenerate = () => {
    const end = form.dateEnd || new Date().toISOString().slice(0, 10);
    const start =
      form.dateStart || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    onSubmit({
      name: form.name,
      type: selectedTemplate?.type ?? "custom",
      format: form.format,
      dateRange: { start, end },
      includeCategories: form.includeCategories,
      includeExpenses: form.includeExpenses,
      includeStaff: form.includeStaff,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Generate Report")}</DialogTitle>
          <DialogDescription>
            {t("Configure your report settings and generate")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="report-name">{t("Report Name")}*</Label>
            <Input
              id="report-name"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              placeholder={t("e.g. January Sales Report")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="format">{t("Format")}</Label>
            <Select
              value={form.format}
              onValueChange={(value) =>
                onFormChange({
                  ...form,
                  format: value as ReportFormat,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date-start">{t("Start Date")}</Label>
              <Input
                id="date-start"
                type="date"
                value={form.dateStart}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    dateStart: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date-end">{t("End Date")}</Label>
              <Input
                id="date-end"
                type="date"
                value={form.dateEnd}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    dateEnd: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="grid gap-3 p-4 border rounded-lg bg-muted/30">
            <Label>{t("Include in Report")}</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-categories"
                checked={form.includeCategories}
                onCheckedChange={(checked) =>
                  onFormChange({
                    ...form,
                    includeCategories: checked as boolean,
                  })
                }
              />
              <label
                htmlFor="include-categories"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("Categories breakdown")}
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-expenses"
                checked={form.includeExpenses}
                onCheckedChange={(checked) =>
                  onFormChange({
                    ...form,
                    includeExpenses: checked as boolean,
                  })
                }
              />
              <label
                htmlFor="include-expenses"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("Expenses and costs")}
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-staff"
                checked={form.includeStaff}
                onCheckedChange={(checked) =>
                  onFormChange({
                    ...form,
                    includeStaff: checked as boolean,
                  })
                }
              />
              <label
                htmlFor="include-staff"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("Staff performance")}
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isSubmitting || !form.name.trim()}
          >
            {t("Generate Report")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


