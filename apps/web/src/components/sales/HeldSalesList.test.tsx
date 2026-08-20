import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import HeldSalesList from "./HeldSalesList";
import type { HeldTransaction } from "@/types/salesTypes";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    formatCurrency: (amount: number) => `₦${amount}`,
  }),
}));

const held: HeldTransaction = {
  id: "h1",
  customerName: "Ada",
  items: [
    { productId: "p1", quantity: 2, price: 50 },
    { productId: "p2", quantity: 1, price: 30 },
  ],
  heldBy: "u1",
  discountPercent: 10,
  paymentMethod: "cash",
  createdAt: "2026-08-01T10:00:00.000Z",
  expiresAt: "2026-08-02T10:00:00.000Z",
};

describe("HeldSalesList", () => {
  afterEach(() => cleanup());

  it("renders nothing when there are no held transactions", () => {
    const { container } = render(
      <HeldSalesList transactions={[]} onResume={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the customer name, item count and discounted total", () => {
    render(
      <HeldSalesList transactions={[held]} onResume={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("3 items")).toBeInTheDocument();
    expect(screen.getByText("₦117")).toBeInTheDocument();
  });

  it("calls onResume with the held transaction", () => {
    const onResume = vi.fn();
    render(
      <HeldSalesList transactions={[held]} onResume={onResume} onDelete={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("Resume"));

    expect(onResume).toHaveBeenCalledWith(held);
  });

  it("calls onDelete with the held id", () => {
    const onDelete = vi.fn();
    render(
      <HeldSalesList transactions={[held]} onResume={vi.fn()} onDelete={onDelete} />,
    );

    fireEvent.click(screen.getByLabelText("Delete held sale"));

    expect(onDelete).toHaveBeenCalledWith("h1");
  });
});