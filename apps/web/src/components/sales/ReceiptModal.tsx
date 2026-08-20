"use client";

import { Receipt, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { SaleRecord } from "@/types/salesTypes";

interface ReceiptModalProps {
  open: boolean;
  sale: SaleRecord | null;
  onClose: () => void;
}

export default function ReceiptModal({
  open,
  sale,
  onClose,
}: ReceiptModalProps) {
  const { t, formatCurrency } = useLanguage();

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            {t("Receipt")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("Sale ID")}</span>
              <span className="font-medium">{sale.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("Sold by")}</span>
              <span className="font-medium">{sale.soldBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("Time")}</span>
              <span className="font-medium">{sale.time}</span>
            </div>
            {sale.paymentMethod && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("Payment Method")}
                </span>
                <span className="font-medium">{t(sale.paymentMethod)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t("Items")}
            </p>
            <div className="divide-y divide-border">
              {sale.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-sm py-2"
                >
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1 border-t border-border pt-3 text-sm">
            {typeof sale.discount === "number" &&
              sale.discount > 0 &&
              (() => {
                const discountAmount =
                  (sale.total * sale.discount) / (100 - sale.discount);
                const subtotal = sale.total + discountAmount;
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("Subtotal")}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("Discount")} ({sale.discount}%)
                      </span>
                      <span className="text-success">
                        -{formatCurrency(discountAmount)}
                      </span>
                    </div>
                  </>
                );
              })()}
            <div className="flex justify-between text-lg font-display font-bold">
              <span>{t("Total")}</span>
              <span className="text-primary">
                {formatCurrency(sale.total)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            aria-label={t("Close receipt")}
          >
            <X className="w-4 h-4 mr-1" />
            {t("Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}