"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import {
  BackendNotification,
  toNotification,
} from "@/lib/adapters/notification.adapter";
import type { Notification } from "@/types/notificationTypes";

interface NotificationsListResponse extends ApiEnvelope<BackendNotification[]> {
  unreadCount: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationsListResponse>("/notifications"),
  });

  const notifications = useMemo(
    () => (notificationsQuery.data?.data ?? []).map(toNotification),
    [notificationsQuery.data],
  );

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch<BackendNotification>(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      api.post<{ updated: number }>("/notifications/mark-all-read"),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/notifications/${id}`),
    onSuccess: invalidate,
  });

  const markAsRead = useCallback(
    (id: string) => markAsReadMutation.mutate(id),
    [markAsReadMutation],
  );

  const markAllAsRead = useCallback(
    () => markAllAsReadMutation.mutate(),
    [markAllAsReadMutation],
  );

  const removeNotification = useCallback(
    (id: string) => removeMutation.mutate(id),
    [removeMutation],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading: notificationsQuery.isLoading,
      isError: notificationsQuery.isError,
      markAsRead,
      markAllAsRead,
      removeNotification,
    }),
    [
      notifications,
      unreadCount,
      notificationsQuery.isLoading,
      notificationsQuery.isError,
      markAsRead,
      markAllAsRead,
      removeNotification,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}