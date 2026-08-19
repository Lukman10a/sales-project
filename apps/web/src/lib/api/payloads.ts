import type { InventoryItem } from "@/types/inventoryTypes";
import type { PaymentPart, SaleRecord } from "@/types/salesTypes";
import type { Permission } from "@/types/teamTypes";

/**
 * Write-guard for team permission payloads. The backend `UpdatePermissionsDto`
 * and `InviteMemberDto` are Zod `.strict()` with a `z.enum(TEAM_PERMISSIONS)`
 * — deprecated UI aliases (`checkout-sales`, `view-out-of-stock`) are silently
 * stripped rather than sent (the backend would otherwise 400).
 */
const DEPRECATED_PERMISSIONS: ReadonlySet<string> = new Set([
  "checkout-sales",
  "view-out-of-stock",
]);

export function toTeamPermissions(permissions: Permission[]): Permission[] {
  return permissions.filter((permission) => !DEPRECATED_PERMISSIONS.has(permission));
}

/**
 * Write-guard for recording a sale. Maps the UI SaleRecord to the backend
 * CreateSaleDto. The backend is Zod `.strict()` — only known keys are emitted
 * and items are reduced to `{ productId, quantity, price }`.
 */
export interface SalePayload {
  items: Array<{ productId: string; quantity: number; price: number }>;
  paymentMethod: "cash" | "card" | "transfer" | "split" | "account";
  discountPercent?: number;
  customerId?: string;
  customerName?: string;
  saleDate?: string;
  splitPayments?: PaymentPart[];
  loyaltyPointsUsed?: number;
  accountCredit?: number;
}

export function toSalePayload(sale: SaleRecord): SalePayload {
  const payload: SalePayload = {
    items: sale.items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId as string,
        quantity: item.quantity,
        price: item.price,
      })),
    paymentMethod: sale.paymentMethod ?? "cash",
  };

  if (sale.discount !== undefined) payload.discountPercent = sale.discount;
  if (sale.customerId) payload.customerId = sale.customerId;
  if (sale.customerName) payload.customerName = sale.customerName;
  if (sale.saleDate) payload.saleDate = sale.saleDate;
  if (sale.splitPayments && sale.splitPayments.length > 0)
    payload.splitPayments = sale.splitPayments;
  if (sale.loyaltyPointsUsed !== undefined)
    payload.loyaltyPointsUsed = sale.loyaltyPointsUsed;
  if (sale.accountCredit !== undefined) payload.accountCredit = sale.accountCredit;

  return payload;
}

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