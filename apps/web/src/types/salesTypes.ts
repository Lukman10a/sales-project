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

export interface SaleRecord {
  id: string;
  items: { name: string; quantity: number; price: number }[];
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