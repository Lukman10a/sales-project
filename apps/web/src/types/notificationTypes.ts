export interface Notification {
  id: string;
  type: "inventory" | "sale" | "alert" | "ai";
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionable?: boolean;
  relatedItemId?: string;
  actionType?: "reorder" | "confirm" | "approve" | "manage" | "task" | "discount" | "return";
}