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
  wholesalePrice: "100.00",
  sellingPrice: "150.50",
  quantity: 5,
  sold: 2,
  status: "in-stock",
  confirmedByApprentice: false,
};

const backendItem2: BackendInventoryItem = {
  id: "i2",
  name: "Gadget",
  category: ["Gadgets"],
  image: "img2.png",
  wholesalePrice: "10.00",
  sellingPrice: "20.00",
  quantity: 0,
  sold: 0,
  status: "out-of-stock",
  confirmedByApprentice: false,
  lastRestocked: "2026-08-01",
};

const newItem: InventoryItem = {
  id: "local-new",
  name: "Gadget",
  category: ["Gadgets"],
  image: "img2.png",
  wholesalePrice: 10,
  sellingPrice: 20,
  quantity: 3,
  sold: 0,
  status: "in-stock",
  confirmedByApprentice: true,
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
    decrementInventory,
    confirmInventoryReceipt,
    bulkImportInventory,
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
            confirmedByApprentice: true,
            image: "new.png",
          }).catch(() => {})
        }
      >
        update
      </button>
      <button onClick={() => void deleteInventoryItem("i1").catch(() => {})}>
        delete
      </button>
      <button onClick={() => void decrementInventory("i1", 2).catch(() => {})}>
        decrement
      </button>
      <button onClick={() => void confirmInventoryReceipt("i1").catch(() => {})}>
        confirm
      </button>
      <button onClick={() => void bulkImportInventory(file).catch(() => {})}>
        bulk
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
          lastRestocked: "2026-08-01T00:00:00.000Z",
          confirmedByApprentice: true,
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
          confirmedByApprentice: true,
          image: "new.png",
        }),
      ),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["inventory"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("confirmInventoryReceipt posts to the confirm endpoint", async () => {
    apiMock.post.mockResolvedValue(backendItem1);
    const { queryClient } = renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByText("confirm"));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith("/inventory/i1/confirm"),
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

  it("decrementInventory posts the quantity and invalidates", async () => {
    apiMock.post.mockResolvedValue(backendItem1);
    const { queryClient } = renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByText("decrement"));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith("/inventory/i1/decrement", {
        quantity: 2,
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["inventory"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("bulkImportInventory posts a multipart FormData file", async () => {
    apiMock.postForm.mockResolvedValue({ imported: 2, skipped: 0, errors: [] });
    const { queryClient } = renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByText("bulk"));

    await waitFor(() =>
      expect(apiMock.postForm).toHaveBeenCalledWith(
        "/inventory/bulk-import",
        expect.any(FormData),
      ),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["inventory"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
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

  it("surfaces a toast.error when decrementing inventory fails", async () => {
    apiMock.post.mockRejectedValue(new Error("Insufficient stock"));
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Widget"),
    );
    toastMock.error.mockClear();

    fireEvent.click(screen.getByText("decrement"));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("Insufficient stock"),
    );
  });
});