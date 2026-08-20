import { roundCurrency } from "./currency";
import type { InventoryItem } from "@/types/inventoryTypes";

export interface BackendInventoryItem {
  id: string;
  name: string;
  category: string[] | string;
  image?: string | null;
  wholesalePrice: number | string;
  sellingPrice: number | string;
  quantity: number;
  sold: number;
  status: "in-stock" | "low-stock" | "out-of-stock";
  confirmedByApprentice: boolean;
  sku?: string | null;
  barcode?: string | null;
  supplier?: string | null;
  reorderPoint?: number | null;
  lastRestocked?: string | Date | null;
  bundleQuantity?: number | null;
  bundlePrice?: number | string | null;
  createdBy?: string;
  createdByName?: string | null;
  confirmedBy?: string | null;
  confirmedAt?: string | Date | null;
  confirmedByName?: string | null;
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
    wholesalePrice: roundCurrency(item.wholesalePrice),
    sellingPrice: roundCurrency(item.sellingPrice),
    quantity: item.quantity,
    sold: item.sold,
    status: item.status,
    confirmedByApprentice: item.confirmedByApprentice,
    sku: item.sku ?? undefined,
    barcode: item.barcode ?? undefined,
    supplier: item.supplier ?? undefined,
    reorderPoint: item.reorderPoint ?? undefined,
    lastRestocked: item.lastRestocked
      ? new Date(item.lastRestocked).toISOString()
      : undefined,
    bundleQuantity: item.bundleQuantity ?? undefined,
    bundlePrice:
      item.bundlePrice !== undefined && item.bundlePrice !== null
        ? roundCurrency(item.bundlePrice)
        : undefined,
    createdBy: item.createdBy ?? undefined,
    createdByName: item.createdByName ?? undefined,
    confirmedBy: item.confirmedBy ?? undefined,
    confirmedAt: item.confirmedAt
      ? new Date(item.confirmedAt).toISOString()
      : undefined,
    confirmedByName: item.confirmedByName ?? undefined,
  };
}