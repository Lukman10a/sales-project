import { formatDistanceToNow } from "date-fns";
import type { Notification, NotificationType } from "@/types/notificationTypes";

export interface BackendNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
}

export function formatNotificationTime(createdAt: string | Date): string {
  return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
}

export function toNotification(notification: BackendNotification): Notification {
  const metadata = notification.metadata ?? {};
  const actionType = metadata.actionType as Notification["actionType"] | undefined;

  return {
    id: notification.id,
    type: notification.type as NotificationType,
    title: notification.title,
    message: notification.message,
    time: formatNotificationTime(notification.createdAt),
    read: notification.read,
    actionable:
      metadata.actionable === true || (actionType !== undefined && actionType !== null)
        ? true
        : undefined,
    relatedItemId:
      typeof metadata.relatedItemId === "string"
        ? metadata.relatedItemId
        : undefined,
    actionType,
  };
}