import type { InventoryItem } from "@/types/inventoryTypes";
import type {
  HeldTransaction,
  PaymentPart,
  SaleRecord,
} from "@/types/salesTypes";
import type { Permission } from "@/types/teamTypes";
import type {
  AppearanceSettings,
  NotificationPreferences,
} from "@/types/profileTypes";

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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

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
  if (sale.customerId && isUuid(sale.customerId))
    payload.customerId = sale.customerId;
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
 * Write-guard for holding a sale. Maps the UI HeldTransaction to the backend
 * CreateHeldTransactionDto. The backend is Zod `.strict()` — the UI-only keys
 * (id, heldBy, createdAt, expiresAt) are dropped so the request does not 400.
 */
export interface HeldPayload {
  customerName: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  discountPercent?: number;
  paymentMethod: "cash" | "card" | "transfer" | "split" | "account";
}

export function toHeldPayload(held: HeldTransaction): HeldPayload {
  const payload: HeldPayload = {
    customerName: held.customerName,
    items: held.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    })),
    paymentMethod: held.paymentMethod ?? "cash",
  };

  if (held.discountPercent !== undefined && held.discountPercent !== 0) {
    payload.discountPercent = held.discountPercent;
  }

  return payload;
}

/**
 * Write-guard for profile updates. The backend `UpdateProfileDto` is Zod
 * `.strict()` — it has no `name`, `email`, `avatar`, `id`, `role` or
 * `joinedDate` keys, so those UI-only keys are dropped. The UI edits a single
 * `name` field, which is split into backend `firstName` / `lastName`.
 */
export interface ProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  bio?: string;
}

export function toProfileUpdate(profile: {
  name: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  bio?: string;
}): ProfileUpdatePayload {
  const payload: ProfileUpdatePayload = {};

  const [firstName, ...rest] = profile.name.trim().split(/\s+/);
  if (firstName) payload.firstName = firstName;
  const lastName = rest.join(" ");
  if (lastName) payload.lastName = lastName;

  if (profile.phone) payload.phone = profile.phone;
  if (profile.company) payload.company = profile.company;
  if (profile.address) payload.address = profile.address;
  if (profile.city) payload.city = profile.city;
  if (profile.country) payload.country = profile.country;
  if (profile.bio) payload.bio = profile.bio;

  return payload;
}

/**
 * Write-guard for profile preference patches. The backend
 * `UpdatePreferencesDto` is Zod `.strict()` — `sms` is a UI-only channel the
 * backend does not model, so it is stripped before sending.
 */
export interface NotificationPreferencesPayload {
  email?: boolean;
  push?: boolean;
  lowStock?: boolean;
  newSales?: boolean;
  reports?: boolean;
  teamActivity?: boolean;
  aiInsights?: boolean;
}

export interface PreferencesUpdatePayload {
  notificationPreferences?: NotificationPreferencesPayload;
  appearanceSettings?: AppearanceSettings;
}

export function toPreferencesUpdate(preferences: {
  notificationPreferences?: NotificationPreferences;
  appearanceSettings?: AppearanceSettings;
}): PreferencesUpdatePayload {
  const payload: PreferencesUpdatePayload = {};

  if (preferences.notificationPreferences) {
    const { sms: _sms, ...rest } = preferences.notificationPreferences;
    void _sms;
    payload.notificationPreferences = { ...rest };
  }

  if (preferences.appearanceSettings) {
    payload.appearanceSettings = { ...preferences.appearanceSettings };
  }

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