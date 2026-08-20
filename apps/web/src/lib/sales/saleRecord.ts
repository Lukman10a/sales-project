import type {
  CartItem,
  HeldTransaction,
  PaymentPart,
  SaleRecord,
} from "@/types/salesTypes";

export interface BuildSaleRecordParams {
  cart: CartItem[];
  soldBy: string;
  paymentMethod: SaleRecord["paymentMethod"];
  discountPercent: number;
  splitPayments: PaymentPart[];
  selectedCustomer?: { name: string } | null;
  loyaltyPointsUsed: number;
  accountCreditUsed: number;
  saleDate: string;
}

export function buildSaleRecord(params: BuildSaleRecordParams): SaleRecord {
  const {
    cart,
    soldBy,
    paymentMethod,
    discountPercent,
    splitPayments,
    selectedCustomer,
    loyaltyPointsUsed,
    accountCreditUsed,
    saleDate,
  } = params;

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.actualPrice * item.quantity,
    0,
  );
  const cartDiscount = (cartSubtotal * discountPercent) / 100;
  const loyaltyDiscount = loyaltyPointsUsed / 100;
  const cartTotal =
    cartSubtotal - cartDiscount - loyaltyDiscount - accountCreditUsed;

  return {
    id: String(Date.now()),
    items: cart.map((c) => ({
      name: c.name,
      productId: c.id,
      quantity: c.quantity,
      price: c.actualPrice,
    })),
    total: cartTotal,
    soldBy,
    time: "just now",
    status: "completed" as const,
    paymentMethod,
    discount: discountPercent,
    splitPayments: paymentMethod === "split" ? splitPayments : undefined,
    customerId: selectedCustomer ? "generated-id" : undefined,
    customerName: selectedCustomer?.name,
    loyaltyPointsUsed,
    accountCredit: accountCreditUsed,
    saleDate,
    saleTimestamp: new Date(saleDate).getTime(),
  };
}

export interface BuildHeldTransactionParams {
  cart: CartItem[];
  customerName: string;
  heldBy: string;
  discountPercent: number;
  paymentMethod: HeldTransaction["paymentMethod"];
}

export function buildHeldTransaction(
  params: BuildHeldTransactionParams,
): HeldTransaction {
  const { cart, customerName, heldBy, discountPercent, paymentMethod } = params;

  const now = Date.now();

  return {
    id: String(now),
    customerName,
    items: cart.map((c) => ({
      productId: c.id,
      quantity: c.quantity,
      price: c.actualPrice,
    })),
    heldBy,
    discountPercent,
    paymentMethod,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
  };
}