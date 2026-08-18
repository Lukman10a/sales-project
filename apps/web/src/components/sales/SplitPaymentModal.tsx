"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Plus, X, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PaymentPart } from "@/types/salesTypes";
import { cn } from "@/lib/utils";

interface SplitPaymentModalProps {
  open: boolean;
  total: number;
  onClose: () => void;
  onApply: (payments: PaymentPart[]) => void;
}

export default function SplitPaymentModal({
  open,
  total,
  onClose,
  onApply,
}: SplitPaymentModalProps) {
  const { t, formatCurrency } = useLanguage();
  const [payments, setPayments] = useState<PaymentPart[]>([
    { method: "cash", amount: total },
  ]);

  useEffect(() => {
    if (open) {
      setPayments([{ method: "cash", amount: total }]);
    }
  }, [open, total]);

  const totalAmount = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount, 0),
    [payments],
  );

  const isValid = Math.abs(totalAmount - total) < 0.01 && payments.length > 0;

  const addPayment = () => {
    const remaining = total - totalAmount;
    setPayments([
      ...payments,
      { method: "card", amount: remaining > 0 ? remaining : 0 },
    ]);
  };

  const removePayment = (index: number) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index));
    }
  };

  const updatePayment = (
    index: number,
    field: keyof PaymentPart,
    value: any,
  ) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [field]: value };
    setPayments(updated);
  };

  const handleApply = () => {
    if (isValid) {
      onApply(payments);
      onClose();
    }
  };

  const methodOptions = ["cash", "card", "transfer"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent" />
            {t("Split Payment")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t("Total")}
              </span>
              <span className="font-bold text-lg">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t("Payment Methods")}
            </Label>
            <AnimatePresence>
              {payments.map((payment, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex gap-2 items-end"
                >
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {t("Method")}
                    </Label>
                    <select
                      value={payment.method}
                      onChange={(e) =>
                        updatePayment(index, "method", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm hover:border-accent/50 transition-colors"
                    >
                      {methodOptions.map((method) => (
                        <option key={method} value={method}>
                          {t(method.charAt(0).toUpperCase() + method.slice(1))}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {t("Amount")}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={payment.amount}
                      onChange={(e) =>
                        updatePayment(index, "amount", Number(e.target.value))
                      }
                      className="h-9 text-sm"
                    />
                  </div>

                  {payments.length > 1 && (
                    <button
                      onClick={() => removePayment(index)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <Button
            onClick={addPayment}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("Add Payment Method")}
          </Button>

          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("Allocated Amount")}
              </span>
              <span
                className={cn(
                  "font-medium",
                  isValid ? "text-success" : "text-destructive",
                )}
              >
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("Remaining")}</span>
              <span
                className={cn(
                  "font-medium",
                  Math.abs(totalAmount - total) < 0.01
                    ? "text-success"
                    : "text-destructive",
                )}
              >
                {formatCurrency(total - totalAmount)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button onClick={onClose} variant="outline">
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!isValid}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <CheckCircle className="w-4 h-4" />
            {t("Apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



