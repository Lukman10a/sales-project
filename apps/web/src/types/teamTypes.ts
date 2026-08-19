export type TeamRole =
  | "owner"
  | "manager"
  | "sales-assistant"
  | "checkout"
  | "inventory";
export type TeamStatus = "active" | "inactive" | "invited";
export type Permission =
  | "view-products"
  | "edit-products"
  | "delete-products"
  | "view-sales-history"
  | "record-sales"
  | "view-inventory"
  | "edit-inventory"
  | "assign-roles"
  | "view-reports"
  | "checkout-sales"
  | "view-out-of-stock";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: TeamRole;
  status: TeamStatus;
  permissions: Permission[];
  avatar?: string;
  joinedDate: string;
  lastActive?: string;
  department?: string;
  invitedBy?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId?: string;
  timestamp: string;
  details?: string;
  ipAddress?: string;
}
