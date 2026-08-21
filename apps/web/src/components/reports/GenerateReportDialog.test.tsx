import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import GenerateReportDialog from "./GenerateReportDialog";
import type {
  CreateReportInput,
  ReportFormat,
  ReportTemplate,
} from "@/types/reportTypes";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const template: ReportTemplate = {
  id: "TPL-001",
  name: "Sales Report",
  type: "sales",
  description: "",
  icon: "TrendingUp",
  metrics: [],
  requiredFields: [],
};

interface FormState {
  name: string;
  format: ReportFormat;
  dateStart: string;
  dateEnd: string;
  includeCategories: boolean;
  includeExpenses: boolean;
  includeStaff: boolean;
}

const baseForm: FormState = {
  name: "",
  format: "pdf",
  dateStart: "2026-08-01",
  dateEnd: "2026-08-20",
  includeCategories: true,
  includeExpenses: false,
  includeStaff: false,
};

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof GenerateReportDialog>> = {},
) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <GenerateReportDialog
      open
      onOpenChange={vi.fn()}
      selectedTemplate={template}
      form={baseForm}
      onFormChange={vi.fn()}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return onSubmit;
}

describe("GenerateReportDialog", () => {
  afterEach(() => cleanup());

  it("calls onSubmit with the formed CreateReportInput when Generate is clicked", async () => {
    const onSubmit = renderDialog({
      form: { ...baseForm, name: "August Sales" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate Report" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const input: CreateReportInput = {
      name: "August Sales",
      type: "sales",
      format: "pdf",
      dateRange: { start: "2026-08-01", end: "2026-08-20" },
      includeCategories: true,
      includeExpenses: false,
      includeStaff: false,
    };
    expect(onSubmit).toHaveBeenCalledWith(input);
  });

  it("defaults the date range to the last 30 days when empty", async () => {
    const onSubmit = renderDialog({
      form: { ...baseForm, name: "August Sales", dateStart: "", dateEnd: "" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate Report" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const input = onSubmit.mock.calls[0][0] as CreateReportInput;
    expect(input.dateRange.end).toBeDefined();
    expect(input.dateRange.start <= input.dateRange.end).toBe(true);
  });

  it("disables the submit button while isSubmitting", () => {
    renderDialog({
      isSubmitting: true,
      form: { ...baseForm, name: "August Sales" },
    });

    expect(
      screen.getByRole("button", { name: "Generate Report" }),
    ).toBeDisabled();
  });
});