export interface SaleItem {
  id: string;
  name: string;
  image: string;
  sellingPrice: number;
  availableQty: number;
  categories?: string[];
}

export interface CartItem extends SaleItem {
  quantity: number;
  actualPrice: number;
}

export interface PaymentPart {
  method: "cash" | "card" | "transfer" | "account";
  amount: number;
}

export type SaleUnit = "unit" | "carton";

/** A held line; `price` is today's catalogue price, set by the server. */
export interface HeldTransactionItem {
  productId: string;
  productName?: string;
  quantity: number;
  unit?: SaleUnit;
  price: number;
}

export interface HeldTransaction {
  id: string;
  customerName: string;
  items: HeldTransactionItem[];
  heldBy: string;
  discountPercent: number;
  paymentMethod: "cash" | "card" | "transfer" | "split" | "account";
  createdAt: string;
  expiresAt: string;
}

export interface SaleRecord {
  id: string;
  items: {
    /** The sale line id, used to refund that line. */
    id?: string;
    name: string;
    productId?: string;
    quantity: number;
    unit?: SaleUnit;
    price: number;
    refundedQuantity?: number;
  }[];
  /** Per-business receipt number (#1218). */
  receiptNumber?: number;
  subtotal?: number;
  vatAmount?: number;
  itemCount?: number;
  total: number;
  soldBy: string;
  soldByName?: string;
  time: string;
  status: "completed" | "pending" | "refunded" | "partial-refund";
  paymentMethod?: "cash" | "card" | "transfer" | "split" | "account";
  discount?: number;
  // Split payment support
  splitPayments?: PaymentPart[];
  // Customer account support
  customerId?: string;
  customerName?: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsUsed?: number;
  accountCredit?: number;
  // Refund support
  refundAmount?: number;
  refundReason?: string;
  refundDate?: string;
  originalSaleId?: string;
  // Date tracking for past sales
  saleDate?: string;
  saleTimestamp?: number;
}