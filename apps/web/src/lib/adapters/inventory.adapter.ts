import { roundCurrency } from "./currency";
import type { InventoryItem } from "@/types/inventoryTypes";

export interface BackendInventoryItem {
  id: string;
  name: string;
  category: string[] | string;
  image?: string | null;
  costPrice: number | string;
  sellingPrice: number | string;
  quantity: number;
  sold: number;
  status: "in-stock" | "low-stock" | "out-of-stock";
  sku?: string | null;
  barcode?: string | null;
  supplier?: string | null;
  reorderPoint?: number | null;
  lastRestocked?: string | Date | null;
  cartonSize?: number | null;
  cartonPrice?: number | string | null;
  createdBy?: string;
  createdByName?: string | null;
  expiryDate?: string | null;
}

export function toInventoryItem(item: BackendInventoryItem): InventoryItem {
  return {
    id: item.id,
    name: item.name,
    category: Array.isArray(item.category)
      ? item.category
      : item.category
        ? [item.category]
        : [],
    image: item.image ?? "",
    costPrice: roundCurrency(item.costPrice),
    sellingPrice: roundCurrency(item.sellingPrice),
    quantity: item.quantity,
    sold: item.sold,
    status: item.status,
    sku: item.sku ?? undefined,
    barcode: item.barcode ?? undefined,
    supplier: item.supplier ?? undefined,
    reorderPoint: item.reorderPoint ?? undefined,
    lastRestocked: item.lastRestocked
      ? new Date(item.lastRestocked).toISOString()
      : undefined,
    cartonSize: item.cartonSize ?? undefined,
    cartonPrice:
      item.cartonPrice !== undefined && item.cartonPrice !== null
        ? roundCurrency(item.cartonPrice)
        : undefined,
    createdBy: item.createdBy ?? undefined,
    createdByName: item.createdByName ?? undefined,
    expiryDate: item.expiryDate ?? undefined,
  };
}