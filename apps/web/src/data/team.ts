import { Permission, TeamRole } from "@/types/teamTypes";

export const rolePermissions: Record<TeamRole, Permission[]> = {
  owner: [
    "view-products",
    "edit-products",
    "delete-products",
    "view-sales-history",
    "record-sales",
    "view-inventory",
    "edit-inventory",
    "assign-roles",
    "view-reports",
  ],
  manager: [
    "view-products",
    "edit-products",
    "view-sales-history",
    "record-sales",
    "view-inventory",
    "edit-inventory",
    "assign-roles",
    "view-reports",
  ],
  "sales-assistant": ["view-products", "record-sales"],
  checkout: ["view-products", "record-sales"],
  inventory: ["view-inventory", "edit-inventory"],
  // Investors have no staff workspace permissions; their screens are mock-only.
  investor: [],
};

export const permissionDescriptions = {
  "view-products": "View products and search inventory",
  "edit-products": "Create and edit product details",
  "delete-products": "Delete products from inventory",
  "view-sales-history": "Access sales history",
  "record-sales": "Record and complete sales",
  "view-inventory": "View inventory lists and stock levels",
  "edit-inventory": "Edit stock levels and quantities",
  "assign-roles": "Assign staff roles and permissions",
  "view-reports": "View business reports",
  "checkout-sales": "Complete sales and checkout (deprecated UI alias for record-sales)",
  "view-out-of-stock": "View out of stock list (deprecated UI alias for view-inventory)",
};
