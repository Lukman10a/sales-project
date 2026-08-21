import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const bulkImportMock = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/InventoryDataContext", () => ({
  useInventoryData: () => ({
    inventory: [],
    bulkImportInventory: bulkImportMock,
    isLoading: false,
  }),
}));

import ImportTab from "./ImportTab";
import { Tabs } from "@/components/ui/tabs";

function renderWithTabs(ui: React.ReactNode) {
  return render(<Tabs value="import">{ui}</Tabs>);
}

describe("ImportTab", () => {
  beforeEach(() => {
    bulkImportMock.mockReset();
    bulkImportMock.mockResolvedValue({ imported: 5, skipped: 1, errors: ["Row 3: bad"] });
  });
  afterEach(() => cleanup());

  it("calls bulkImportInventory with selected file and shows result", async () => {
    renderWithTabs(<ImportTab />);
    fireEvent.click(screen.getByRole("button", { name: /Import Data/i }));
    const file = new File(["name,price\nA,10"], "test.csv", { type: "text/csv" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    // simulate file selection
    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });
    fireEvent.change(input);

    // click Start Import
    const startButton = screen.getByRole("button", { name: /Start Import/i });
    fireEvent.click(startButton);

    await waitFor(() => expect(bulkImportMock).toHaveBeenCalledWith(file));
    await waitFor(() => expect(screen.getAllByText(/5 imported/i).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/1 skipped/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Row 3: bad/).length).toBeGreaterThan(0);
  });

  it("disables button while pending", async () => {
    let resolve!: (v: any) => void;
    bulkImportMock.mockReturnValue(new Promise((r) => (resolve = r)));
    renderWithTabs(<ImportTab />);
    fireEvent.click(screen.getByRole("button", { name: /Import Data/i }));
    const file = new File(["a"], "test.csv", { type: "text/csv" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file], writable: false });
    fireEvent.change(input);
    fireEvent.click(screen.getByRole("button", { name: /Start Import/i }));
    // button should be disabled or show loading (text changes to Importing...)
    await waitFor(() => {
      const btns = screen.getAllByRole("button");
      const startBtn = btns.find((b) => /Start Import|Importing/.test(b.textContent || ""));
      expect(startBtn).toBeTruthy();
      expect(startBtn!.hasAttribute("disabled") || (startBtn!.textContent || "").includes("Importing")).toBeTruthy();
    });
    resolve({ imported: 1, skipped: 0, errors: [] });
    await waitFor(() => expect(screen.getAllByText(/1 imported/i).length).toBeGreaterThan(0));
  });

  it("shows error message on failure", async () => {
    bulkImportMock.mockRejectedValue(new Error("Upload failed"));
    renderWithTabs(<ImportTab />);
    fireEvent.click(screen.getByRole("button", { name: /Import Data/i }));
    const file = new File(["a"], "test.csv", { type: "text/csv" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file], writable: false });
    fireEvent.change(input);
    fireEvent.click(screen.getByRole("button", { name: /Start Import/i }));
    await waitFor(() => expect(screen.getAllByText(/Upload failed/i).length).toBeGreaterThan(0));
  });
});
