"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
} from "react";
import { Notification } from "@/types/notificationTypes";

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("luxa_notifications");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Notification[];
        setNotifications(parsed);
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    }
    setIsHydrated(true);

    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "luxa_notifications" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Notification[];
          setNotifications(parsed);
        } catch (error) {
          console.error("Failed to sync notifications:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(
          "luxa_notifications",
          JSON.stringify(notifications),
        );
      } catch (error) {
        console.error("Failed to save notifications:", error);
      }
    }
  }, [notifications, isHydrated]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id">) => {
      const id = `notif-${Date.now()}`;
      const fullNotification: Notification = {
        ...notification,
        id,
      };
      setNotifications((prev) => [fullNotification, ...prev]);
    },
    [],
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead,
      }}
    >
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
