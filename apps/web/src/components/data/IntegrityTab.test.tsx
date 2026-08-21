import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const integrityMock = vi.hoisted(() => ({
  checks: [] as any[],
  isLoading: false,
  runCheck: vi.fn(),
}));

vi.mock("@/hooks/useIntegrityCheck", () => ({
  useIntegrityCheck: () => integrityMock,
}));

import IntegrityTab from "./IntegrityTab";
import { Tabs } from "@/components/ui/tabs";

function renderWithTabs(ui: React.ReactNode) {
  return render(<Tabs value="integrity">{ui}</Tabs>);
}

describe("IntegrityTab", () => {
  afterEach(() => cleanup());

  it("renders live pass/fail badges from checks", () => {
    integrityMock.checks = [
      { id: "negative", name: "No negative quantities", status: "passed", description: "All quantities are non-negative" },
      { id: "low-stock", name: "Low-stock counts match", status: "warning", description: "Low-stock count mismatch: expected 1 but got 2" },
    ];
    integrityMock.isLoading = false;
    integrityMock.runCheck = vi.fn();

    renderWithTabs(<IntegrityTab />);

    expect(screen.getByText("Data Integrity Checks")).toBeInTheDocument();
    expect(screen.getByText("No negative quantities")).toBeInTheDocument();
    expect(screen.getByText("Low-stock counts match")).toBeInTheDocument();
    expect(screen.getByText("passed")).toBeInTheDocument();
    expect(screen.getByText("warning")).toBeInTheDocument();
    expect(screen.getByText(/All quantities are non-negative/)).toBeInTheDocument();
  });

  it("shows healthy when all passed", () => {
    integrityMock.checks = [
      { id: "negative", name: "No negative quantities", status: "passed", description: "ok" },
      { id: "low-stock", name: "Low-stock counts match", status: "passed", description: "ok" },
      { id: "out-stock", name: "Out-of-stock counts match", status: "passed", description: "ok" },
    ];
    renderWithTabs(<IntegrityTab />);
    expect(screen.getByText(/Healthy/i)).toBeInTheDocument();
  });

  it("calls runCheck when button clicked", () => {
    integrityMock.checks = [
      { id: "negative", name: "No negative quantities", status: "passed", description: "ok" },
    ];
    const spy = vi.fn();
    integrityMock.runCheck = spy;
    renderWithTabs(<IntegrityTab />);
    fireEvent.click(screen.getByRole("button", { name: /Run Check Now/i }));
    expect(spy).toHaveBeenCalled();
  });

  it("shows failed status when present", () => {
    integrityMock.checks = [
      { id: "negative", name: "No negative quantities", status: "failed", description: "Found negative quantity" },
    ];
    renderWithTabs(<IntegrityTab />);
    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(screen.getByText(/Found negative quantity/)).toBeInTheDocument();
  });
});
