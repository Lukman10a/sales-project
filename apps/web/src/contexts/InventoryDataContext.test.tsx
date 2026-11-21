import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { InventoryDataProvider, useInventoryData } from "./InventoryDataContext";
import type { BackendInventoryItem } from "@/lib/adapters/inventory.adapter";
import type { InventoryItem } from "@/types/inventoryTypes";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  postForm: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ api: apiMock }));

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/components/ui/sonner", () => ({ toast: toastMock }));

const backendItem1: BackendInventoryItem = {
  id: "i1",
  name: "Widget",
  category: ["tools"],
  image: null,
  costPrice: "100.00",
  sellingPrice: "150.50",
  quantity: 5,
  sold: 2,
  status: "in-stock",
};

const backendItem2: BackendInventoryItem = {
  id: "i2",
  name: "Gadget",
  category: ["Gadgets"],
  image: "img2.png",
  costPrice: "10.00",
  sellingPrice: "20.00",
  quantity: 0,
  sold: 0,
  status: "out-of-stock",
  lastRestocked: "2026-08-01",
};

const newItem: InventoryItem = {
  id: "local-new",
  name: "Gadget",
  category: ["Gadgets"],
  image: "img2.png",
  costPrice: 10,
  sellingPrice: 20,
  quantity: 3,
  sold: 0,
  status: "in-stock",
  lastRestocked: "2026-08-01T00:00:00.000Z",
};

const file = new File(["name,sellingPrice\nA,10"], "data.csv", {
  type: "text/csv",
});

function pagination(total: number) {
  return { page: 1, limit: 100, total, pages: 1 };
}

function Harness() {
  const {
    inventory,
    isLoading,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    restockItem,
    adjustStock,
    previewImport,
    confirmImport,
    totalItemsInStock,
    lowStockItems,
    outOfStockItems,
  } = useInventoryData();

  const widget = inventory.find((i) => i.id === "i1");

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="names">{inventory.map((i) => i.name).join(",")}</span>
      <span data-testid="price">{widget?.sellingPrice ?? ""}</span>
      <span data-testid="total">{totalItemsInStock}</span>
      <span data-testid="low">{lowStockItems}</span>
      <span data-testid="out">{outOfStockItems}</span>
      <button onClick={() => void addInventoryItem(newItem).catch(() => {})}>
        add
      </button>
      <button
        onClick={() =>
          void updateInventoryItem("i1", {
            image: "new.png",
          }).catch(() => {})
        }
      >
        update
      </button>
      <button onClick={() => void deleteInventoryItem("i1").catch(() => {})}>
        delete
      </button>
      <button onClick={() => void restockItem("i1", 5, "Delivery").catch(() => {})}>
        restock
      </button>
      <button
        onClick={() => void adjustStock("i1", -2, "Broken").catch(() => {})}
      >
        adjust
      </button>
      <button onClick={() => void previewImport(file).catch(() => {})}>
        preview
      </button>
      <button onClick={() => void confirmImport(file).catch(() => {})}>
        import
      </button>
    </div>
  );
}

function renderContext(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <InventoryDataProvider>{ui}</InventoryDataProvider>
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

describe("InventoryDataContext", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.postForm.mockReset();
    apiMock.patch.mockReset();
    apiMock.delete.mockReset();
    apiMock.get.mockResolvedValue({
      data: [backendItem1, backendItem2],
      pagination: pagination(2),
    });
  });

  afterEach(() => cleanup());

  it("populates inventory from GET /inventory and adapts decimal strings", async () => {
    renderContext(<Harness />);

    expect(apiMock.get).toHaveBeenCalledWith("/inventory?limit=100");
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    expect(screen.getByTestId("names").textContent).toContain("Gadget");
    expect(screen.getByTestId("price").textContent).toBe("150.5");
  });

  it("computes low/out-of-stock/total stats from live data", async () => {
    renderContext(<Harness />);

    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    expect(screen.getByTestId("total").textContent).toBe("1");
    expect(screen.getByTestId("low").textContent).toBe("0");
    expect(screen.getByTestId("out").textContent).toBe("1");
  });

  it("addInventoryItem posts the payload and invalidates inventory + dashboard", async () => {
    const serverItems: BackendInventoryItem[] = [backendItem1];
    apiMock.get.mockImplementation(async (path: string) => {
      if (path === "/inventory?limit=100") {
        return { data: serverItems, pagination: pagination(serverItems.length) };
      }
      return { data: [], pagination: pagination(0) };
    });
    apiMock.post.mockImplementation(async (path: string, body: unknown) => {
      const created: BackendInventoryItem = {
        ...backendItem2,
        name: (body as { name: string }).name,
      };
      serverItems.unshift(created);
      return created;
    });

    const { queryClient } = renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toBe("Widget"),
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByText("add"));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        "/inventory",
        expect.objectContaining({
          name: "Gadget",
          image: "img2.png",
          quantity: 3,
        }),
      ),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["inventory"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Gadget"),
    );
  });

  it("updateInventoryItem patches the mapped payload", async () => {
    apiMock.patch.mockResolvedValue(backendItem1);
    const { queryClient } = renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByText("update"));

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith(
        "/inventory/i1",
        expect.objectContaining({
          image: "new.png",
        }),
      ),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["inventory"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("deleteInventoryItem calls DELETE and invalidates", async () => {
    apiMock.delete.mockResolvedValue({ message: "deleted" });
    const { queryClient } = renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByText("delete"));

    await waitFor(() =>
      expect(apiMock.delete).toHaveBeenCalledWith("/inventory/i1"),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["inventory"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("restockItem posts the quantity and note, then refreshes the history", async () => {
    apiMock.post.mockResolvedValue(backendItem1);
    const { queryClient } = renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByText("restock"));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith("/inventory/i1/restock", {
        quantity: 5,
        note: "Delivery",
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["inventory"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["stock-movements", "i1"],
    });
  });

  it("adjustStock posts the delta with its reason", async () => {
    apiMock.post.mockResolvedValue(backendItem1);
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );

    fireEvent.click(screen.getByText("adjust"));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith("/inventory/i1/adjust", {
        delta: -2,
        reason: "Broken",
      }),
    );
  });

  it("previews an import without refreshing, and confirming refreshes", async () => {
    apiMock.postForm.mockResolvedValue({
      summary: { rows: 1, valid: 1, invalid: 0, creates: 1, updates: 0 },
      rows: [],
    });
    const { queryClient } = renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByText("preview"));
    await waitFor(() =>
      expect(apiMock.postForm).toHaveBeenCalledWith(
        "/inventory/import/preview",
        expect.any(FormData),
      ),
    );
    expect(invalidateSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("import"));
    await waitFor(() =>
      expect(apiMock.postForm).toHaveBeenCalledWith(
        "/inventory/import/confirm",
        expect.any(FormData),
      ),
    );
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["inventory"] }),
    );
  });

  it("never reads luxa_inventory from localStorage", async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    renderContext(<Harness />);

    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    expect(getItemSpy).not.toHaveBeenCalledWith("luxa_inventory");
  });

  it("surfaces a toast.error when adding an inventory item fails", async () => {
    apiMock.post.mockRejectedValue(new Error("Barcode already exists"));
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    toastMock.error.mockClear();

    fireEvent.click(screen.getByText("add"));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("Barcode already exists"),
    );
  });

  it("surfaces a toast.error when an adjustment fails", async () => {
    apiMock.post.mockRejectedValue(new Error("Insufficient stock"));
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    toastMock.error.mockClear();

    fireEvent.click(screen.getByText("adjust"));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("Insufficient stock"),
    );
  });
});