import type { InventoryItem } from '../entities/inventory-item.entity';

/** A product's stock status from its quantity and reorder point. */
export function calculateStatus(
  quantity: number,
  reorderPoint?: number | null,
): InventoryItem['status'] {
  if (quantity <= 0) return 'out-of-stock';
  if (
    reorderPoint !== undefined &&
    reorderPoint !== null &&
    quantity <= reorderPoint
  )
    return 'low-stock';
  return 'in-stock';
}
