export const ALL_PERMISSIONS = [
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

// Default permission set for each staff role, used when a TeamMember row has
// no stored permissions (e.g. legacy members invited before permissions were
// recorded). Owner resolves to ALL_PERMISSIONS and is not listed here.
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  manager: [
    'view-products',
    'edit-products',
    'view-sales-history',
    'record-sales',
    'view-inventory',
    'assign-roles',
    'view-reports',
  ],
  'sales-assistant': ['view-products', 'record-sales'],
  checkout: ['view-products', 'record-sales'],
  inventory: ['view-inventory', 'edit-inventory'],
  // Investors have no staff workspace permissions; their screens are mock-only.
  investor: [],
};
