import type { InventoryItem } from "@/types/inventoryTypes";

/**
 * Write-guard for inventory create/update payloads. The backend DTOs are
 * Zod `.strict()` — unknown keys (id, sold, status) are rejected with a 400.
 * Only defined, backend-valid fields are emitted; empty strings and empty
 * category arrays are dropped rather than sent.
 */
export interface InventoryPayload {
  name?: string;
  category?: string[];
  sku?: string;
  barcode?: string;
  image?: string;
  wholesalePrice?: number;
  sellingPrice?: number;
  quantity?: number;
  reorderPoint?: number;
  supplier?: string;
  bundleQuantity?: number;
  bundlePrice?: number;
  lastRestocked?: string;
  confirmedByApprentice?: boolean;
}

export function toInventoryPayload(
  item: Partial<InventoryItem>,
): InventoryPayload {
  const payload: InventoryPayload = {};

  if (item.name !== undefined) payload.name = item.name;
  if (item.category !== undefined && item.category.length > 0)
    payload.category = item.category;
  if (item.sku) payload.sku = item.sku;
  if (item.barcode) payload.barcode = item.barcode;
  if (item.image) payload.image = item.image;
  if (item.wholesalePrice !== undefined)
    payload.wholesalePrice = item.wholesalePrice;
  if (item.sellingPrice !== undefined)
    payload.sellingPrice = item.sellingPrice;
  if (item.quantity !== undefined) payload.quantity = item.quantity;
  if (item.reorderPoint !== undefined)
    payload.reorderPoint = item.reorderPoint;
  if (item.supplier) payload.supplier = item.supplier;
  if (item.bundleQuantity !== undefined)
    payload.bundleQuantity = item.bundleQuantity;
  if (item.bundlePrice !== undefined) payload.bundlePrice = item.bundlePrice;
  if (item.lastRestocked) payload.lastRestocked = item.lastRestocked;
  if (item.confirmedByApprentice !== undefined)
    payload.confirmedByApprentice = item.confirmedByApprentice;

  return payload;
}