import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";

const previewMock = vi.hoisted(() => vi.fn());
const confirmMock = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/InventoryDataContext", () => ({
  useInventoryData: () => ({
    previewImport: previewMock,
    confirmImport: confirmMock,
  }),
}));

import ImportTab from "./ImportTab";
import { Tabs } from "@/components/ui/tabs";

const preview = {
  summary: { rows: 3, valid: 2, invalid: 1, creates: 1, updates: 1 },
  rows: [
    { row: 2, name: "Rice", action: "update", quantity: 5, stockChange: 1, errors: [] },
    { row: 3, name: "Milk", action: "create", quantity: 2, stockChange: 2, errors: [] },
    {
      row: 4,
      name: "Beans",
      action: "create",
      quantity: 0,
      stockChange: 0,
      errors: ["sellingPrice is required"],
    },
  ],
};

function chooseFile() {
  const file = new File(["name,sellingPrice\nA,10"], "stock.csv", {
    type: "text/csv",
  });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file], writable: false });
  fireEvent.change(input);
  return file;
}

describe("ImportTab", () => {
  beforeEach(() => {
    previewMock.mockReset().mockResolvedValue(preview);
    confirmMock.mockReset().mockResolvedValue(preview);
  });
  afterEach(() => cleanup());

  it("previews the file without saving, then imports on confirm", async () => {
    render(
      <Tabs value="import">
        <ImportTab />
      </Tabs>,
    );
    const file = chooseFile();
    fireEvent.click(screen.getByRole("button", { name: /Check file/i }));

    await waitFor(() => expect(previewMock).toHaveBeenCalledWith(file));
    expect(await screen.findByText(/Nothing has been saved yet/)).toBeTruthy();
    expect(screen.getByText("sellingPrice is required")).toBeTruthy();
    expect(screen.getByText("1 with errors")).toBeTruthy();
    expect(confirmMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Import 2 products/i }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalledWith(file));
    expect(await screen.findByText(/1 added, 1 updated, 1 skipped/)).toBeTruthy();
  });

  it("offers the template download", () => {
    render(
      <Tabs value="import">
        <ImportTab />
      </Tabs>,
    );
    const link = screen.getByRole("link", { name: /Download template/i });
    expect(link.getAttribute("href")).toContain("/inventory/import/template");
  });

  it("shows the error when the check fails", async () => {
    previewMock.mockRejectedValue(new Error("The file is larger than 5 MB"));
    render(
      <Tabs value="import">
        <ImportTab />
      </Tabs>,
    );
    chooseFile();
    fireEvent.click(screen.getByRole("button", { name: /Check file/i }));
    expect(await screen.findByText("The file is larger than 5 MB")).toBeTruthy();
  });
});
