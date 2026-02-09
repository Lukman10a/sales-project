"use client";

import { useState, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw,
  Search,
  CheckCircle,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SaleRecord } from "@/types/salesTypes";
import { cn } from "@/lib/utils";

interface RefundModalProps {
  open: boolean;
  recentSales: SaleRecord[];
  onClose: () => void;
  onProcessRefund: (
    saleId: string,
    refundAmount: number,
    reason: string,
  ) => void;
}

export default function RefundModal({
  open,
  recentSales,
  onClose,
  onProcessRefund,
}: RefundModalProps) {
  const { t, formatCurrency } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState("");
  const [refundType, setRefundType] = useState<"full" | "partial">("full");

  const completedSales = useMemo(
    () => recentSales.filter((s) => s.status === "completed"),
    [recentSales],
  );

  const filteredSales = useMemo(
    () =>
      completedSales.filter(
        (s) =>
          s.id.includes(searchQuery) ||
          s.soldBy.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [completedSales, searchQuery],
  );

  const handleSelectSale = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setRefundAmount(sale.total);
    setRefundType("full");
    setRefundReason("");
  };

  const handleRefundTypeChange = (type: "full" | "partial") => {
    setRefundType(type);
    if (type === "full" && selectedSale) {
      setRefundAmount(selectedSale.total);
    }
  };

  const isValidRefund =
    selectedSale &&
    refundAmount > 0 &&
    refundAmount <= selectedSale.total &&
    refundReason.trim().length > 0;

  const handleProcessRefund = () => {
    if (isValidRefund && selectedSale) {
      onProcessRefund(selectedSale.id, refundAmount, refundReason);
      setSelectedSale(null);
      setRefundAmount(0);
      setRefundReason("");
      setSearchQuery("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-accent" />
            {t("Process Refund")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!selectedSale ? (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {t("Select Sale")}
                </Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder={t("Search sale ID or seller name")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {filteredSales.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      {t("No completed sales found")}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredSales.map((sale) => (
                      <motion.button
                        key={sale.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onClick={() => handleSelectSale(sale)}
                        className="w-full p-3 rounded-lg border-2 border-border hover:border-accent/50 text-left transition-all hover:bg-accent/5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {t("Sale ID")}: {sale.id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("Sold by")}: {sale.soldBy}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-accent">
                              {formatCurrency(sale.total)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {sale.time}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sale.items.slice(0, 2).map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-muted text-xs rounded"
                            >
                              {item.name} (x{item.quantity})
                            </span>
                          ))}
                          {sale.items.length > 2 && (
                            <span className="px-2 py-1 bg-muted text-xs rounded">
                              +{sale.items.length - 2} {t("more")}
                            </span>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Selected Sale Summary */}
              <div className="p-4 rounded-lg border-2 border-accent/50 bg-accent/5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">
                      {t("Sale ID")}: {selectedSale.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("Sold by")}: {selectedSale.soldBy}
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectedSale(null)}
                    variant="ghost"
                    size="sm"
                  >
                    {t("Change")}
                  </Button>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <p className="font-medium text-muted-foreground">
                    {t("Items")}:
                  </p>
                  <div className="grid gap-1">
                    {selectedSale.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-xs text-muted-foreground"
                      >
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span>
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between font-semibold text-accent">
                  <span>{t("Original Amount")}:</span>
                  <span>{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>

              {/* Refund Type Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("Refund Type")}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleRefundTypeChange("full")}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all text-sm font-medium",
                      refundType === "full"
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50",
                    )}
                  >
                    {t("Full Refund")}
                  </button>
                  <button
                    onClick={() => handleRefundTypeChange("partial")}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all text-sm font-medium",
                      refundType === "partial"
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50",
                    )}
                  >
                    {t("Partial Refund")}
                  </button>
                </div>
              </div>

              {/* Refund Amount */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="w-4 h-4" />
                  {t("Refund Amount")}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={selectedSale.total}
                  step="1000"
                  value={refundAmount}
                  onChange={(e) =>
                    setRefundAmount(
                      Math.min(
                        selectedSale.total,
                        Math.max(0, Number(e.target.value)),
                      ),
                    )
                  }
                  className="h-8 text-sm"
                  disabled={refundType === "full"}
                />
                <p className="text-xs text-muted-foreground">
                  {t("Max amount")}: {formatCurrency(selectedSale.total)}
                </p>
              </div>

              {/* Refund Reason */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("Reason")}</Label>
                <Textarea
                  placeholder={t(
                    "Explain why this refund is being processed...",
                  )}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="min-h-[100px] resize-none text-sm"
                />
              </div>

              {/* Refund Summary */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("Refund Summary")}
                </p>
                <div className="flex justify-between text-sm">
                  <span>{t("Original Amount")}</span>
                  <span className="font-medium">
                    {formatCurrency(selectedSale.total)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("Refund Amount")}</span>
                  <span className="font-medium text-destructive">
                    -{formatCurrency(refundAmount)}
                  </span>
                </div>
                {refundAmount < selectedSale.total && (
                  <div className="flex justify-between text-sm">
                    <span>{t("Amount Kept")}</span>
                    <span className="font-medium">
                      {formatCurrency(selectedSale.total - refundAmount)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button onClick={onClose} variant="outline">
            {t("Cancel")}
          </Button>
          {selectedSale && (
            <Button
              onClick={handleProcessRefund}
              disabled={!isValidRefund}
              className="gap-2 bg-gradient-accent"
            >
              <CheckCircle className="w-4 h-4" />
              {t("Process Refund")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
