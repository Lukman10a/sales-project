import { roundCurrency } from "./currency";
import { formatDistanceToNow } from "date-fns";
import type { SaleRecord, PaymentPart } from "@/types/salesTypes";

export interface BackendSaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number | string;
  total: number | string;
}

export interface BackendSale {
  id: string;
  total: number | string;
  paymentMethod: "cash" | "card" | "transfer" | "split" | "account";
  status: "completed" | "pending" | "refunded" | "partial-refund";
  saleDate: string;
  soldBy: string;
  soldByName?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  discountPercent: number | string;
  refundAmount?: number | string | null;
  refundReason?: string | null;
  createdAt: string;
  itemCount?: number;
  items?: BackendSaleItem[];
  splitPayments?: PaymentPart[] | null;
  loyaltyPointsUsed?: number | null;
  accountCredit?: number | null;
}

function toSaleItem(
  item: BackendSaleItem,
): { name: string; quantity: number; price: number } {
  return {
    name: item.productName,
    quantity: item.quantity,
    price: roundCurrency(item.price),
  };
}

export function toSaleRecord(sale: BackendSale): SaleRecord {
  return {
    id: sale.id,
    items: (sale.items ?? []).map(toSaleItem),
    itemCount: sale.itemCount ?? sale.items?.length ?? 0,
    total: roundCurrency(sale.total),
    soldBy: sale.soldBy,
    soldByName: sale.soldByName ?? undefined,
    time: formatDistanceToNow(new Date(sale.createdAt), { addSuffix: true }),
    saleTimestamp: new Date(sale.createdAt).getTime(),
    status: sale.status,
    paymentMethod: sale.paymentMethod,
    discount: roundCurrency(sale.discountPercent),
    customerId: sale.customerId ?? undefined,
    customerName: sale.customerName ?? undefined,
    splitPayments: sale.splitPayments ?? undefined,
    loyaltyPointsUsed: sale.loyaltyPointsUsed ?? undefined,
    accountCredit: sale.accountCredit ?? undefined,
    refundAmount:
      sale.refundAmount !== undefined && sale.refundAmount !== null
        ? roundCurrency(sale.refundAmount)
        : undefined,
    refundReason: sale.refundReason ?? undefined,
    saleDate: sale.saleDate,
  };
}
