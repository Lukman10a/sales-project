"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
const NotificationActionModal = dynamic(
  () => import("@/components/notifications/NotificationActionModal"),
  { ssr: false, loading: () => null },
);
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  ShoppingCart,
  AlertTriangle,
  Sparkles,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import type { NotificationType } from "@/types/notificationTypes";
import type { Notification } from "@/types/notificationTypes";

const typeConfig: Record<
  NotificationType,
  { icon: typeof Package; bgClass: string; iconClass: string }
> = {
  inventory: {
    icon: Package,
    bgClass: "bg-primary/10",
    iconClass: "text-primary",
  },
  sale: {
    icon: ShoppingCart,
    bgClass: "bg-success/10",
    iconClass: "text-success",
  },
  alert: {
    icon: AlertTriangle,
    bgClass: "bg-destructive/10",
    iconClass: "text-destructive",
  },
  ai: {
    icon: Sparkles,
    bgClass: "bg-accent/10",
    iconClass: "text-accent",
  },
  system: {
    icon: Info,
    bgClass: "bg-muted/40",
    iconClass: "text-muted-foreground",
  },
};

function configFor(type: NotificationType) {
  return typeConfig[type] ?? typeConfig.system;
}

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [activeNotification, setActiveNotification] =
    useState<Notification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { t } = useLanguage();

  const filteredNotifs =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const handleTakeAction = (notif: Notification) => {
    setActiveNotification(notif);
    setModalOpen(true);
  };

  const handleActionComplete = () => {
    if (activeNotification) {
      markAsRead(activeNotification.id);
    }
    setModalOpen(false);
    setActiveNotification(null);
  };

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              {t("Notifications")}
            </h1>
            <p className="text-muted-foreground">
              {t("Stay updated with your business activities")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="w-4 h-4 mr-2" />
                {t("Mark all as read")}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center border rounded-lg p-1 bg-card">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("All")}
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                filter === "unread"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("Unread")}
              {unreadCount > 0 && (
                <Badge className="bg-destructive text-destructive-foreground text-xs h-5">
                  {unreadCount}
                </Badge>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl border shadow-sm p-4 animate-pulse"
                >
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="mt-3 h-3 bg-muted/70 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="bg-card rounded-xl border shadow-sm p-12 text-center">
              <Bell className="w-12 h-12 text-destructive/40 mx-auto mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                {t("Failed to load notifications")}
              </h3>
              <p className="text-muted-foreground">
                {t("Something went wrong while fetching your notifications.")}
              </p>
            </div>
          ) : filteredNotifs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-xl border shadow-sm p-12 text-center"
            >
              <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                {t("All caught up!")}
              </h3>
              <p className="text-muted-foreground">
                {filter === "unread"
                  ? t("No unread notifications at the moment.")
                  : t("No notifications at the moment.")}
              </p>
            </motion.div>
          ) : (
            filteredNotifs.map((notif, index) => {
              const config = configFor(notif.type);
              const Icon = config.icon;
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "bg-card rounded-xl border p-4 transition-all card-hover",
                    !notif.read && "border-l-4 border-l-accent",
                  )}
                >
                  <div className="flex gap-4">
                    <div className={cn("p-3 rounded-xl h-fit", config.bgClass)}>
                      <Icon className={cn("w-5 h-5", config.iconClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">
                          {t(notif.title)}
                        </h3>
                        <button
                          onClick={() => removeNotification(notif.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-muted-foreground text-sm mb-3">
                        {t(notif.message)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {t(notif.time, { fallback: notif.time })}
                        </span>
                        <div className="flex items-center gap-2">
                          {!notif.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notif.id)}
                              className="h-8"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              {t("Mark as read")}
                            </Button>
                          )}
                          {notif.actionable && (
                            <Button
                              size="sm"
                              className="h-8 bg-accent text-accent-foreground hover:bg-accent/90"
                              onClick={() => handleTakeAction(notif)}
                            >
                              {t("Take Action")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Notification Action Modal */}
      {activeNotification && (
        <NotificationActionModal
          notification={activeNotification}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onActionComplete={handleActionComplete}
        />
      )}
    </>
  );
}