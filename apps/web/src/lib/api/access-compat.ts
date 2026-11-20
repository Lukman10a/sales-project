import type { Permission, TeamRole } from "@/types/teamTypes";

/**
 * Compatibility layer for the T33 access model. The backend now speaks
 * Owner / Manager / Cashier and the canonical permission names
 * (`sales.record`, `products.edit_price`, ...). The current screens still use
 * the older role and permission names; T43–T50 rebuild them on the new model
 * and this file goes away.
 */

/** Backend permissions as the screens name them. */
const TO_LEGACY: Record<string, Permission[]> = {
  "sales.record": ["record-sales", "view-sales-history"],
  "products.edit_price": ["edit-products"],
  "products.delete": ["delete-products"],
  "products.restock": ["edit-inventory"],
  "staff.manage": ["assign-roles"],
  "reports.view_profit": ["view-reports"],
};

/** Every member may browse products and stock. */
const ALWAYS: Permission[] = ["view-products", "view-inventory"];

/** Screen permissions as the backend names them; view-* need nothing. */
const TO_BACKEND: Partial<Record<Permission, string>> = {
  "record-sales": "sales.record",
  "checkout-sales": "sales.record",
  "edit-products": "products.edit_price",
  "delete-products": "products.delete",
  "edit-inventory": "products.restock",
  "assign-roles": "staff.manage",
  "view-reports": "reports.view_profit",
};

export function fromBackendPermissions(permissions: readonly string[]): Permission[] {
  const out = new Set<Permission>(ALWAYS);
  for (const p of permissions) for (const legacy of TO_LEGACY[p] ?? []) out.add(legacy);
  return [...out];
}

export function toBackendPermissions(permissions: readonly Permission[]): string[] {
  const out = new Set<string>();
  for (const p of permissions) {
    const mapped = TO_BACKEND[p];
    if (mapped) out.add(mapped);
  }
  return [...out];
}

/** Backend team roles are manager and cashier. */
export function toBackendRole(role: TeamRole): "manager" | "cashier" {
  return role === "manager" || role === "owner" ? "manager" : "cashier";
}

/** A backend cashier shows as the checkout role the screens know. */
export function fromBackendTeamRole(role: string): TeamRole {
  if (role === "manager" || role === "owner") return role;
  if (role === "cashier") return "checkout";
  return role as TeamRole;
}
