/**
 * The canonical permission set (T33), matching the Staff screen. Owners hold
 * every permission; staff hold what their team-member row grants.
 */
export const PERMISSIONS = [
  'sales.record',
  'sales.discount',
  'sales.refund',
  'products.edit_price',
  'products.restock',
  'products.delete',
  'reports.view_profit',
  'staff.manage',
  'billing.manage',
  'settings.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Roles a team member can hold. The owner is the account that registered. */
export const STAFF_ROLES = ['manager', 'cashier'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Login roles: the owner plus the staff roles. */
export const USER_ROLES = ['owner', ...STAFF_ROLES] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface RolePreset {
  permissions: readonly Permission[];
  /** Largest discount (percent of the sale) a person may give. */
  maxDiscountPercent: number;
}

/**
 * Starting permissions for each role. A team member's row may then be edited
 * switch by switch; the preset only fills a new or reset member.
 */
export const ROLE_PRESETS: Record<UserRole, RolePreset> = {
  owner: { permissions: PERMISSIONS, maxDiscountPercent: 100 },
  manager: {
    permissions: [
      'sales.record',
      'sales.discount',
      'sales.refund',
      'products.restock',
    ],
    maxDiscountPercent: 10,
  },
  cashier: { permissions: ['sales.record'], maxDiscountPercent: 0 },
};

export const isPermission = (value: string): value is Permission =>
  (PERMISSIONS as readonly string[]).includes(value);
