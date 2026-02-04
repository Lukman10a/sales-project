"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  Package,
  RotateCcw,
  Tag,
  AlertTriangle,
  ShoppingCart,
  Clock,
  MessageSquare,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";
import { cn } from "@/lib/utils";

interface NotificationActionModalProps {
  notification: {
    id: string;
    type: "inventory" | "sale" | "alert" | "ai";
    title: string;
    message: string;
    time: string;
    read: boolean;
    actionable?: boolean;
    relatedItemId?: string;
    actionType?:
      | "reorder"
      | "confirm"
      | "approve"
      | "manage"
      | "task"
      | "discount"
      | "return";
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete?: () => void;
}

type ActionState =
  | "idle"
  | "stock-alert"
  | "pending-confirmation"
  | "sales-related"
  | "system-message"
  | "processing";

export default function NotificationActionModal({
  notification,
  open,
  onOpenChange,
  onActionComplete,
}: NotificationActionModalProps) {
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({
    quantity: 0,
    reason: "",
    notes: "",
    discountPercent: 0,
    returnQuantity: 0,
  });

  const { inventory, updateInventoryItem, addInventoryItem } =
    useInventoryData();
  const { t, formatCurrency } = useLanguage();

  const relatedItem = inventory.find(
    (i) => i.id === notification.relatedItemId,
  );

  // Determine which action modal to show based on notification type
  const getInitialState = (): ActionState => {
    if (notification.type === "alert" || notification.type === "ai") {
      return "stock-alert";
    }
    if (notification.message.toLowerCase().includes("confirm")) {
      return "pending-confirmation";
    }
    if (notification.type === "sale") {
      return "sales-related";
    }
    return "system-message";
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setActionState("idle");
      setFormData({
        quantity: 0,
        reason: "",
        notes: "",
        discountPercent: 0,
        returnQuantity: 0,
      });
    }
    onOpenChange(newOpen);
  };

  // Stock Alert Actions
  const handleReorderNow = async () => {
    if (!relatedItem || !formData.quantity) {
      toast(t("Please enter a quantity to reorder"));
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newQuantity = relatedItem.quantity + formData.quantity;
      updateInventoryItem(relatedItem.id, {
        quantity: newQuantity,
        status: newQuantity > 20 ? "in-stock" : "low-stock",
      });

      toast(
        t("Reorder placed successfully for {item}", {
          values: { item: relatedItem.name },
        }),
      );
      setActionState("idle");
      handleOpenChange(false);
      onActionComplete?.();
    } catch {
      toast(t("Failed to process reorder"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!relatedItem || !formData.discountPercent) {
      toast(t("Please enter a discount percentage"));
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const discountedPrice = Math.max(
        relatedItem.wholesalePrice,
        relatedItem.sellingPrice * (1 - formData.discountPercent / 100),
      );

      updateInventoryItem(relatedItem.id, {
        sellingPrice: discountedPrice,
      });

      toast(
        t("Discount applied: {percent}% off", {
          values: { percent: formData.discountPercent },
        }),
      );
      setActionState("idle");
      handleOpenChange(false);
      onActionComplete?.();
    } catch {
      toast(t("Failed to apply discount"));
    } finally {
      setIsLoading(false);
    }
  };

  // Pending Confirmation Actions
  const handleConfirmReceipt = async (approved: boolean) => {
    if (!relatedItem) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (approved) {
        updateInventoryItem(relatedItem.id, {
          confirmedByApprentice: true,
        });
        toast(t("Inventory receipt confirmed successfully"));
      } else {
        toast(t("Inventory receipt rejected. Please contact admin."));
      }

      setActionState("idle");
      handleOpenChange(false);
      onActionComplete?.();
    } catch {
      toast(t("Failed to process confirmation"));
    } finally {
      setIsLoading(false);
    }
  };

  // Sales Related Actions
  const handleProcessReturn = async () => {
    if (!relatedItem || !formData.returnQuantity) {
      toast(t("Please enter return quantity"));
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newQuantity = relatedItem.quantity + formData.returnQuantity;
      const newSoldCount = Math.max(
        0,
        relatedItem.sold - formData.returnQuantity,
      );

      updateInventoryItem(relatedItem.id, {
        quantity: newQuantity,
        sold: newSoldCount,
      });

      toast(
        t("Return processed: {qty} units returned for {item}", {
          values: { qty: formData.returnQuantity, item: relatedItem.name },
        }),
      );

      setActionState("idle");
      handleOpenChange(false);
      onActionComplete?.();
    } catch {
      toast(t("Failed to process return"));
    } finally {
      setIsLoading(false);
    }
  };

  // System Message Actions
  const handleAcknowledge = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast(t("Notification acknowledged"));
      setActionState("idle");
      handleOpenChange(false);
      onActionComplete?.();
    } catch {
      toast(t("Failed to acknowledge"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{notification.title}</DialogTitle>
          <DialogDescription>{notification.message}</DialogDescription>
        </DialogHeader>

        {/* Stock Alert Actions */}
        {actionState === "idle" &&
        (notification.type === "alert" || notification.type === "ai") ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 py-4"
          >
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {t("Available Actions")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("Choose an action to manage this inventory alert")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto py-3 px-4"
                onClick={() => setActionState("stock-alert")}
              >
                <RotateCcw className="w-5 h-5 mr-3 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{t("Reorder Now")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Request to purchase more units")}
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-3 px-4"
                onClick={() => setActionState("stock-alert")}
              >
                <Tag className="w-5 h-5 mr-3 text-accent" />
                <div className="text-left">
                  <p className="font-medium">{t("Apply Discount/Sale")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Reduce price to clear inventory")}
                  </p>
                </div>
              </Button>

              {relatedItem && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {t("Item Details")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("Name")}</p>
                      <p className="font-medium">{relatedItem.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {t("Current Stock")}
                      </p>
                      <p className="font-medium">{relatedItem.quantity}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("Price")}</p>
                      <p className="font-medium">
                        {formatCurrency(relatedItem.sellingPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("Sold")}</p>
                      <p className="font-medium">{relatedItem.sold}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}

        {/* Reorder Form */}
        {actionState === "stock-alert" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 py-4"
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{t("Action Type")}</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={
                      formData.actionType === "reorder" ? "default" : "outline"
                    }
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        actionType: "reorder",
                      }))
                    }
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t("Reorder")}
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      formData.actionType === "discount" ? "default" : "outline"
                    }
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        actionType: "discount",
                      }))
                    }
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    {t("Discount")}
                  </Button>
                </div>
              </div>

              {formData.actionType === "reorder" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">{t("Quantity to Reorder")}</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantity: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder={t("Enter quantity")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">{t("Reason (Optional)")}</Label>
                    <Textarea
                      id="reason"
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          reason: e.target.value,
                        }))
                      }
                      placeholder={t("e.g., High demand expected")}
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="discount">
                      {t("Discount Percentage (%)")}
                    </Label>
                    <Input
                      id="discount"
                      type="number"
                      min={0}
                      max={100}
                      value={formData.discountPercent}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          discountPercent: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder={t("e.g., 15")}
                    />
                  </div>
                  {relatedItem && formData.discountPercent > 0 && (
                    <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">
                        {t("New Price")}
                      </p>
                      <p className="text-lg font-bold text-success">
                        {formatCurrency(
                          relatedItem.sellingPrice *
                            (1 - formData.discountPercent / 100),
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("Savings: {amount}", {
                          values: {
                            amount: formatCurrency(
                              relatedItem.sellingPrice *
                                (formData.discountPercent / 100),
                            ),
                          },
                        })}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setActionState("idle")}>
                {t("Back")}
              </Button>
              <Button
                onClick={
                  formData.actionType === "reorder"
                    ? handleReorderNow
                    : handleApplyDiscount
                }
                disabled={
                  isLoading ||
                  (formData.actionType === "reorder" && !formData.quantity) ||
                  (formData.actionType === "discount" &&
                    !formData.discountPercent)
                }
              >
                {isLoading ? t("Processing...") : t("Confirm Action")}
              </Button>
            </DialogFooter>
          </motion.div>
        )}

        {/* Pending Confirmation */}
        {actionState === "idle" &&
        notification.message.toLowerCase().includes("confirm") ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 py-4"
          >
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {t("Action Required")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("Please approve or reject this request")}
                </p>
              </div>
            </div>

            {relatedItem && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="font-medium text-foreground">
                  {t("Item Information")}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("Item")}</span>
                    <span className="font-medium">{relatedItem.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("Category")}
                    </span>
                    <span className="font-medium">{relatedItem.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("New Quantity")}
                    </span>
                    <span className="font-medium">{relatedItem.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("Cost Price")}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(relatedItem.wholesalePrice)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleConfirmReceipt(false)}
                disabled={isLoading}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t("Reject")}
              </Button>
              <Button
                onClick={() => handleConfirmReceipt(true)}
                disabled={isLoading}
                className="bg-success text-success-foreground hover:bg-success/90"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isLoading ? t("Processing...") : t("Approve")}
              </Button>
            </DialogFooter>
          </motion.div>
        ) : null}

        {/* Sales Related Actions */}
        {actionState === "idle" && notification.type === "sale" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 py-4"
          >
            <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex gap-3">
              <ShoppingCart className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {t("Sales Management")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("Take action on this sales transaction")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto py-3 px-4"
                onClick={() => setActionState("sales-related")}
              >
                <RotateCcw className="w-5 h-5 mr-3 text-destructive" />
                <div className="text-left">
                  <p className="font-medium">{t("Process Return")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Accept returned items from customer")}
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-3 px-4"
                onClick={() => toast(t("View order details in sales page"))}
              >
                <ShoppingCart className="w-5 h-5 mr-3 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{t("View Full Details")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("See complete order information")}
                  </p>
                </div>
              </Button>
            </div>
          </motion.div>
        ) : null}

        {/* Return Form */}
        {actionState === "sales-related" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 py-4"
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="returnQty">{t("Quantity Returned")}</Label>
                <Input
                  id="returnQty"
                  type="number"
                  min={1}
                  value={formData.returnQuantity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      returnQuantity: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder={t("Enter quantity")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t("Return Reason/Notes")}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder={t(
                    "e.g., Defective item, customer request, etc.",
                  )}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setActionState("idle")}>
                {t("Back")}
              </Button>
              <Button
                onClick={handleProcessReturn}
                disabled={isLoading || !formData.returnQuantity}
              >
                {isLoading ? t("Processing...") : t("Process Return")}
              </Button>
            </DialogFooter>
          </motion.div>
        )}

        {/* System Message / General Actions */}
        {actionState === "idle" &&
        notification.type !== "alert" &&
        notification.type !== "ai" &&
        notification.type !== "sale" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 py-4"
          >
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex gap-3">
              <MessageSquare className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {t("Acknowledge Message")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("Mark this notification as read and archived")}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {t("Cancel")}
              </Button>
              <Button onClick={handleAcknowledge} disabled={isLoading}>
                {isLoading ? t("Processing...") : t("Acknowledge")}
              </Button>
            </DialogFooter>
          </motion.div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
