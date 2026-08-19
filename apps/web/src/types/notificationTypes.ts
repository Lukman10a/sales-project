export type NotificationType =
  | "inventory"
  | "sale"
  | "alert"
  | "ai"
  | "system"
  | (string & {});

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionable?: boolean;
  relatedItemId?: string;
  actionType?: "reorder" | "confirm" | "approve" | "manage" | "task" | "discount" | "return";
}