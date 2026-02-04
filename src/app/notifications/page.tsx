"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotificationActionModal from "@/components/notifications/NotificationActionModal";
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  ShoppingCart,
  AlertTriangle,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getNotificationsByRole } from "@/data/roleNotifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Notification } from "@/types/notificationTypes";

const typeConfig = {
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
};

export default function Notifications() {
  const { user } = useAuth();
  const userRole = user?.role || "owner";
  const [notifs, setNotifs] = useState(getNotificationsByRole(userRole));
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [activeNotification, setActiveNotification] =
    useState<Notification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setNotifs(getNotificationsByRole(userRole));
  }, [userRole]);

  const unreadCount = notifs.filter((n) => !n.read).length;
  const filteredNotifs =
    filter === "unread" ? notifs.filter((n) => !n.read) : notifs;

  const markAsRead = (id: string) => {
    setNotifs(notifs.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifs(notifs.map((n) => ({ ...n, read: true })));
  };

  const dismissNotif = (id: string) => {
    setNotifs(notifs.filter((n) => n.id !== id));
  };

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
          {filteredNotifs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-2xl border card-elevated p-12 text-center"
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
              const config = typeConfig[notif.type];
              const Icon = config.icon;
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "bg-card rounded-2xl border p-4 transition-all card-hover",
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
                          onClick={() => dismissNotif(notif.id)}
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
