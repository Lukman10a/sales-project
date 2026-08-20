"use client";

import { motion } from "framer-motion";
import {
  ShoppingCart,
  Package,
  CheckCircle,
  X,
  Plus,
  Minus,
  Percent,
  Banknote,
  CreditCard,
  Smartphone,
  Split,
  User,
  Calendar,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { CartItem, PaymentPart } from "@/types/salesTypes";
import Image from "next/image";

interface CartSidebarProps {
  cart: CartItem[];
  discountPercent: number;
  paymentMethod: "cash" | "card" | "transfer" | "split" | "account";
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onUpdatePrice: (itemId: string, price: number) => void;
  onDiscountChange: (discount: number) => void;
  onPaymentMethodChange: (
    method: "cash" | "card" | "transfer" | "split" | "account",
  ) => void;
  onCompleteSale: () => void;
  onHoldSale?: () => void;
  onOpenSplitPayment?: () => void;
  onOpenCustomerAccount?: () => void;
  onOpenDatePicker?: () => void;
  splitPayments?: PaymentPart[];
  selectedCustomer?: { name: string } | null;
  saleDate?: string;
}

export default function CartSidebar({
  cart,
  discountPercent,
  paymentMethod,
  onRemoveItem,
  onUpdateQuantity,
  onUpdatePrice,
  onDiscountChange,
  onPaymentMethodChange,
  onCompleteSale,
  onHoldSale,
  onOpenSplitPayment,
  onOpenCustomerAccount,
  onOpenDatePicker,
  splitPayments,
  selectedCustomer,
  saleDate,
}: CartSidebarProps) {
  const { t, formatCurrency } = useLanguage();

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.actualPrice * item.quantity,
    0,
  );
  const cartDiscount = (cartSubtotal * discountPercent) / 100;
  const cartTotal = cartSubtotal - cartDiscount;

  return (
    <div className="bg-card rounded-xl border p-6 sticky top-24 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <ShoppingCart className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground tracking-tight">
            {t("Current Sale")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {cart.length} {cart.length === 1 ? t("item") : t("items")}
          </p>
        </div>
      </div>

      {/* Selected Features Header */}
      {(selectedCustomer || saleDate || splitPayments) && (
        <div className="mb-4 space-y-2 pb-3 border-b">
          {selectedCustomer && (
            <div className="flex items-center gap-2 p-2 rounded bg-primary/10">
              <User className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">
                {t("Customer")}: {selectedCustomer.name}
              </span>
            </div>
          )}
          {saleDate && (
            <div className="flex items-center gap-2 p-2 rounded bg-primary/10">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">
                {t("Sale Date")}: {saleDate}
              </span>
            </div>
          )}
          {splitPayments && splitPayments.length > 1 && (
            <div className="flex items-center gap-2 p-2 rounded bg-primary/10">
              <Split className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">
                {t("Split Payment")}: {splitPayments.length} {t("methods")}
              </span>
            </div>
          )}
        </div>
      )}

      {cart.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {t("Click on products to add them to the sale")}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
            {cart.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex gap-3 p-3 rounded-xl bg-muted/50"
              >
                <Image
                  width={64}
                  height={64}
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {item.name}
                    </h4>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs text-muted-foreground">
                      {t("Actual Price")}
                    </label>
                    <Input
                      type="number"
                      value={item.actualPrice}
                      onChange={(e) =>
                        onUpdatePrice(item.id, Number(e.target.value))
                      }
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("Subtotal")}</span>
              <span className="font-medium">
                {formatCurrency(cartSubtotal)}
              </span>
            </div>

            {/* Discount Input */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-2">
                <Percent className="w-3 h-3" />
                {t("Discount (%)")}
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) =>
                  onDiscountChange(
                    Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                  )
                }
                className="h-8 text-sm"
                placeholder="0"
              />
            </div>

            {discountPercent > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>{t("Discount")}</span>
                <span>-{formatCurrency(cartDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-lg font-display font-bold">
              <span>{t("Total")}</span>
              <span className="text-primary">{formatCurrency(cartTotal)}</span>
            </div>

            {/* Advanced Options Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {onOpenCustomerAccount && (
                <Button
                  onClick={onOpenCustomerAccount}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <User className="w-3 h-3 mr-1" />
                  {t("Customer")}
                </Button>
              )}
              {onOpenDatePicker && (
                <Button
                  onClick={onOpenDatePicker}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  {t("Date")}
                </Button>
              )}
              {onOpenSplitPayment && (
                <Button
                  onClick={onOpenSplitPayment}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Split className="w-3 h-3 mr-1" />
                  {t("Split")}
                </Button>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-xs">{t("Payment Method")}</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onPaymentMethodChange("cash")}
                  className={cn(
                    "p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1",
                    paymentMethod === "cash"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-muted-foreground",
                  )}
                >
                  <Banknote className="w-4 h-4" />
                  <span className="text-xs font-medium">{t("Cash")}</span>
                </button>
                <button
                  onClick={() => onPaymentMethodChange("card")}
                  className={cn(
                    "p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1",
                    paymentMethod === "card"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-muted-foreground",
                  )}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs font-medium">{t("Card")}</span>
                </button>
                <button
                  onClick={() => onPaymentMethodChange("transfer")}
                  className={cn(
                    "p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1",
                    paymentMethod === "transfer"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-muted-foreground",
                  )}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="text-xs font-medium">{t("Transfer")}</span>
                </button>
              </div>
            </div>

            <Button
              onClick={onCompleteSale}
              disabled={cart.length === 0}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-4"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {t("Complete Sale")}
            </Button>

            {onHoldSale && (
              <Button
                onClick={onHoldSale}
                disabled={cart.length === 0}
                variant="outline"
                className="w-full mt-2"
              >
                <Pause className="w-4 h-4 mr-2" />
                {t("Hold Sale")}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}



