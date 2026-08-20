import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import CartSidebar from "./CartSidebar";
import type { CartItem } from "@/types/salesTypes";

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} />
  ),
}));

vi.mock("framer-motion", () => ({
  motion: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    formatCurrency: (amount: number) => `₦${amount}`,
  }),
}));

const cartItem: CartItem = {
  id: "p1",
  name: "Shoes",
  image: "/shoes.png",
  actualPrice: 100,
  quantity: 2,
};

const baseProps = {
  cart: [cartItem] as CartItem[],
  discountPercent: 0,
  paymentMethod: "cash" as const,
  onRemoveItem: vi.fn(),
  onUpdateQuantity: vi.fn(),
  onUpdatePrice: vi.fn(),
  onDiscountChange: vi.fn(),
  onPaymentMethodChange: vi.fn(),
  onCompleteSale: vi.fn(),
};

describe("CartSidebar", () => {
  afterEach(() => cleanup());

  it("shows the Hold Sale button when onHoldSale is provided", () => {
    render(<CartSidebar {...baseProps} onHoldSale={vi.fn()} />);
    expect(screen.getByText("Hold Sale")).toBeInTheDocument();
  });

  it("does not show the Hold Sale button when onHoldSale is omitted", () => {
    render(<CartSidebar {...baseProps} />);
    expect(screen.queryByText("Hold Sale")).not.toBeInTheDocument();
  });

  it("calls onHoldSale when clicked", () => {
    const onHoldSale = vi.fn();
    render(<CartSidebar {...baseProps} onHoldSale={onHoldSale} />);

    fireEvent.click(screen.getByText("Hold Sale"));

    expect(onHoldSale).toHaveBeenCalledTimes(1);
  });

  it("disables the Hold Sale button when the cart is empty", () => {
    render(
      <CartSidebar
        {...baseProps}
        cart={[]}
        onHoldSale={vi.fn()}
      />,
    );

    expect(screen.queryByText("Hold Sale")).not.toBeInTheDocument();
  });
});