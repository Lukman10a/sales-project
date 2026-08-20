import type { InventoryItem } from "@/types/inventoryTypes";

/**
 * Two-party acknowledgment rule, mirrored from InventoryService.confirm:
 * owner confirms anything; manager confirms items created by someone else;
 * apprentice confirms only items they created. Confirmed items never show
 * another confirm action.
 */
export function canConfirmItem(
  item: Pick<InventoryItem, "confirmedByApprentice" | "createdBy">,
  userRole: string,
  currentUserId?: string,
): boolean {
  if (item.confirmedByApprentice) return false;
  if (userRole === "owner") return true;
  if (userRole === "manager") return item.createdBy !== currentUserId;
  if (userRole === "apprentice") return item.createdBy === currentUserId;
  return false;
}