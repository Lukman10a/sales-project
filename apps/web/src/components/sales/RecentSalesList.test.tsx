import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import RecentSalesList from "./RecentSalesList";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    formatCurrency: (amount: number) => `₦${amount}`,
  }),
}));

const sale = {
  id: "s1",
  items: [{ name: "Shoes", quantity: 2, price: 100 }],
  total: 200,
  soldBy: "Ada",
  time: "5 minutes ago",
  status: "completed" as const,
  paymentMethod: "cash",
  discount: 0,
};

describe("RecentSalesList", () => {
  afterEach(() => cleanup());

  it("renders the sales and calls onViewReceipt with the sale", () => {
    const onViewReceipt = vi.fn();
    render(
      <RecentSalesList sales={[sale]} onViewReceipt={onViewReceipt} />,
    );

    fireEvent.click(screen.getByLabelText("View receipt for {name}"));

    expect(onViewReceipt).toHaveBeenCalledWith(sale);
  });

  it("does not render receipt buttons when onViewReceipt is omitted", () => {
    render(<RecentSalesList sales={[sale]} />);

    expect(
      screen.queryByLabelText("View receipt for {name}"),
    ).not.toBeInTheDocument();
  });
});