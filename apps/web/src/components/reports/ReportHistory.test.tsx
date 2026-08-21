import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ReportHistory from "./ReportHistory";
import type { Report } from "@/types/reportTypes";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const baseReport: Report = {
  id: "r1",
  name: "August Sales",
  type: "sales",
  format: "pdf",
  status: "completed",
  createdAt: "2026-08-20T10:00:00.000Z",
  createdBy: "u1",
  createdByName: "Ada Lovelace",
  dateRange: { start: "2026-08-01", end: "2026-08-20" },
  snapshot: { type: "sales" },
};

describe("ReportHistory", () => {
  afterEach(() => cleanup());

  it("renders live reports with creator names", () => {
    render(<ReportHistory reports={[baseReport]} />);

    expect(screen.getByText("August Sales")).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
  });

  it("falls back to createdBy when createdByName is missing", () => {
    render(
      <ReportHistory reports={[{ ...baseReport, createdByName: undefined }]} />,
    );

    expect(screen.getByText(/u1/)).toBeInTheDocument();
  });

  it("renders a delete button that triggers onDelete", () => {
    const onDelete = vi.fn();
    render(<ReportHistory reports={[baseReport]} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith(baseReport);
  });
});