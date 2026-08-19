export interface SaleItem {
  id: string;
  name: string;
  image: string;
  sellingPrice: number;
  availableQty: number;
}

export interface CartItem extends SaleItem {
  quantity: number;
  actualPrice: number;
}

export interface PaymentPart {
  method: "cash" | "card" | "transfer" | "account";
  amount: number;
}

export interface HeldTransactionItem {
  productId: string;
  quantity: number;
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
    name: string;
    productId?: string;
    quantity: number;
    price: number;
  }[];
  itemCount?: number;
  total: number;
  soldBy: string;
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