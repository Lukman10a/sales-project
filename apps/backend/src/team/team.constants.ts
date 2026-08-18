export const TEAM_ROLES = [
  'manager',
  'sales-assistant',
  'checkout',
  'inventory',
] as const;

export const TEAM_PERMISSIONS = [
  'view-products',
  'edit-products',
  'delete-products',
  'view-sales-history',
  'record-sales',
  'view-inventory',
  'edit-inventory',
  'assign-roles',
  'view-reports',
] as const;
