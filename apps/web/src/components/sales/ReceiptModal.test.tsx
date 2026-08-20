import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import ReceiptModal from "./ReceiptModal";
import type { SaleRecord } from "@/types/salesTypes";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    formatCurrency: (amount: number) => `₦${amount}`,
  }),
}));

const sale: SaleRecord = {
  id: "s1",
  items: [
    { name: "Shoes", quantity: 2, price: 100 },
    { name: "Belt", quantity: 1, price: 30 },
  ],
  total: 230,
  soldBy: "Ada",
  time: "5 minutes ago",
  status: "completed",
  paymentMethod: "cash",
  discount: 0,
};

describe("ReceiptModal", () => {
  afterEach(() => cleanup());

  it("renders nothing when sale is null", () => {
    const { container } = render(
      <ReceiptModal open={true} sale={null} onClose={vi.fn()} />,
    );

    expect(container).not.toHaveTextContent("Receipt");
  });

  it("shows the sale details when a sale is provided", () => {
    render(<ReceiptModal open={true} sale={sale} onClose={vi.fn()} />);

    expect(screen.getByText("Receipt")).toBeInTheDocument();
    expect(screen.getByText("s1")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Shoes × 2")).toBeInTheDocument();
    expect(screen.getByText("₦230")).toBeInTheDocument();
  });

  it("shows a line total for each item", () => {
    render(<ReceiptModal open={true} sale={sale} onClose={vi.fn()} />);

    expect(screen.getByText("₦200")).toBeInTheDocument();
    expect(screen.getByText("₦30")).toBeInTheDocument();
  });

  it("shows the pre-discount subtotal and discount for a discounted sale", () => {
    const discountedSale = { ...sale, total: 90, discount: 10 };
    render(<ReceiptModal open={true} sale={discountedSale} onClose={vi.fn()} />);

    expect(screen.getByText("₦100")).toBeInTheDocument();
    expect(screen.getByText("-₦10")).toBeInTheDocument();
    expect(screen.getByText("₦90")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<ReceiptModal open={true} sale={sale} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close receipt" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});