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
import { SalesDataProvider, useSalesData } from "./SalesDataContext";
import type { BackendSale } from "@/lib/adapters/sale.adapter";
import type { SaleRecord, HeldTransaction } from "@/types/salesTypes";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ api: apiMock }));

const backendSale1: BackendSale = {
  id: "s1",
  total: "150.00",
  paymentMethod: "cash",
  status: "completed",
  saleDate: "2026-08-01",
  soldBy: "u1",
  discountPercent: "10.00",
  createdAt: "2026-08-01T12:00:00.000Z",
  itemCount: 2,
};

const backendSale2: BackendSale = {
  id: "s2",
  total: "50.00",
  paymentMethod: "card",
  status: "completed",
  saleDate: "2026-08-02",
  soldBy: "u1",
  discountPercent: "0.00",
  createdAt: "2026-08-02T12:00:00.000Z",
  itemCount: 1,
};

const backendHeld: HeldTransaction = {
  id: "h1",
  customerName: "Ada",
  items: [{ productId: "p1", quantity: 1, price: 50 }],
  heldBy: "u1",
  discountPercent: 0,
  paymentMethod: "cash",
  createdAt: "2026-08-01T10:00:00.000Z",
  expiresAt: "2026-08-02T10:00:00.000Z",
};

const newRecord: SaleRecord = {
  id: "local-new",
  items: [{ name: "Widget", productId: "p1", quantity: 2, price: 50 }],
  total: 100,
  soldBy: "u1",
  time: "just now",
  status: "completed",
  paymentMethod: "cash",
  discount: 0,
};

function pagination(total: number) {
  return { page: 1, limit: 100, total, pages: 1 };
}

function summary() {
  return {
    totalSales: 200,
    totalTransactions: 2,
    averageTransaction: 100,
  };
}

function Harness() {
  const {
    recentSales,
    isLoading,
    addSaleRecord,
    refundSale,
    getSaleById,
    heldTransactions,
    createHeld,
    deleteHeld,
    totalSalesAmount,
    totalItemsSold,
  } = useSalesData();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="ids">{recentSales.map((s) => s.id).join(",")}</span>
      <span data-testid="count">{recentSales[0]?.itemCount ?? ""}</span>
      <span data-testid="items">{recentSales[0]?.items.length ?? ""}</span>
      <span data-testid="total">{totalSalesAmount}</span>
      <span data-testid="sold">{totalItemsSold}</span>
      <span data-testid="held">{heldTransactions.map((h) => h.id).join(",")}</span>
      <button onClick={() => addSaleRecord(newRecord)}>add</button>
      <button onClick={() => refundSale("s1", 50, "reason")}>refund</button>
      <button onClick={() => void getSaleById("s1")}>receipt</button>
      <button onClick={() => createHeld(backendHeld)}>createHeld</button>
      <button onClick={() => deleteHeld("h1")}>deleteHeld</button>
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
      <SalesDataProvider>{ui}</SalesDataProvider>
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

describe("SalesDataContext", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
    apiMock.delete.mockReset();
    apiMock.get.mockImplementation(async (path: string) => {
      if (path === "/sales?limit=100") {
        return {
          data: [backendSale1, backendSale2],
          pagination: pagination(2),
          summary: summary(),
        };
      }
      if (path === "/sales/held") {
        return [backendHeld];
      }
      return { data: [], pagination: pagination(0), summary: summary() };
    });
  });

  afterEach(() => cleanup());

  it("populates recentSales from GET /sales and adapts itemCount/items", async () => {
    renderContext(<Harness />);

    expect(apiMock.get).toHaveBeenCalledWith("/sales?limit=100");
    await waitFor(() =>
      expect(screen.getByTestId("ids").textContent).toContain("s1"),
    );
    expect(screen.getByTestId("ids").textContent).toContain("s2");
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("items").textContent).toBe("0");
  });

  it("computes totalSalesAmount and totalItemsSold from completed sales", async () => {
    renderContext(<Harness />);

    await waitFor(() =>
      expect(screen.getByTestId("ids").textContent).toContain("s1"),
    );
    expect(screen.getByTestId("total").textContent).toBe("200");
    expect(screen.getByTestId("sold").textContent).toBe("3");
  });

  it("addSaleRecord posts the mapped payload and invalidates sales/inventory/dashboard", async () => {
    apiMock.post.mockImplementation(async (path: string, body: unknown) => {
      const created: BackendSale = {
        ...backendSale1,
        id: (body as { items: unknown[] }).items.length > 0 ? "s-new" : "s1",
      };
      return created;
    });

    const { queryClient } = renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("ids").textContent).toContain("s1"),
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByText("add"));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        "/sales",
        expect.objectContaining({
          items: [{ productId: "p1", quantity: 2, price: 50 }],
          paymentMethod: "cash",
        }),
      ),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sales"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["inventory"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("refundSale patches the refund endpoint and invalidates", async () => {
    apiMock.patch.mockResolvedValue({ id: "s1", status: "refunded" });
    const { queryClient } = renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("ids").textContent).toContain("s1"),
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByText("refund"));

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith("/sales/s1/refund", {
        refundAmount: 50,
        refundReason: "reason",
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sales"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["inventory"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("getSaleById fetches the receipt via GET /sales/:id", async () => {
    apiMock.get.mockImplementation(async (path: string) => {
      if (path === "/sales/s1") {
        return {
          ...backendSale1,
          items: [
            {
              id: "item1",
              productId: "p1",
              productName: "Widget",
              quantity: 2,
              price: "50.00",
              total: "100.00",
            },
          ],
        };
      }
      return { data: [], pagination: pagination(0), summary: summary() };
    });
    let getSaleByIdRef: ((id: string) => Promise<SaleRecord | null>) | null =
      null;
    function ReceiptHarness() {
      getSaleByIdRef = useSalesData().getSaleById;
      return null;
    }
    renderContext(<ReceiptHarness />);
    await waitFor(() => expect(getSaleByIdRef).not.toBeNull());

    const sale = await getSaleByIdRef!("s1");
    expect(apiMock.get).toHaveBeenCalledWith("/sales/s1");
    expect(sale).not.toBeNull();
    expect(sale.items).toEqual([
      { name: "Widget", quantity: 2, price: 50 },
    ]);
  });

  it("loads held transactions from GET /sales/held", async () => {
    renderContext(<Harness />);

    expect(apiMock.get).toHaveBeenCalledWith("/sales/held");
    await waitFor(() =>
      expect(screen.getByTestId("held").textContent).toBe("h1"),
    );
  });

  it("createHeld posts a write-guarded payload to /sales/held", async () => {
    apiMock.post.mockResolvedValue(backendHeld);
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("held").textContent).toContain("h1"),
    );

    fireEvent.click(screen.getByText("createHeld"));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith("/sales/held", {
        customerName: "Ada",
        items: [{ productId: "p1", quantity: 1, price: 50 }],
        paymentMethod: "cash",
      }),
    );
    const body = apiMock.post.mock.calls[0][1];
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("heldBy");
    expect(body).not.toHaveProperty("createdAt");
    expect(body).not.toHaveProperty("expiresAt");
  });

  it("deleteHeld calls DELETE /sales/held/:id", async () => {
    apiMock.delete.mockResolvedValue({ message: "removed" });
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("held").textContent).toContain("h1"),
    );

    fireEvent.click(screen.getByText("deleteHeld"));

    await waitFor(() =>
      expect(apiMock.delete).toHaveBeenCalledWith("/sales/held/h1"),
    );
  });

  it("never reads luxa_sales from localStorage", async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    renderContext(<Harness />);

    await waitFor(() =>
      expect(screen.getByTestId("ids").textContent).toContain("s1"),
    );
    expect(getItemSpy).not.toHaveBeenCalledWith("luxa_sales");
  });
});
