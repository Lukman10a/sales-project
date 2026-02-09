"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CartItem, PaymentPart } from "@/types/salesTypes";

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  discountPercent: number;
  paymentMethod: "cash" | "card" | "transfer" | "split" | "account";
  splitPayments?: PaymentPart[];
  customerName?: string;
  loyaltyPointsUsed: number;
  accountCreditUsed: number;
  saleDate: string;
  soldBy: string;
  onConfirmSale: () => void;
  onPrintAndComplete: () => void;
}

export default function PrintPreviewDialog({
  open,
  onOpenChange,
  cart,
  discountPercent,
  paymentMethod,
  splitPayments,
  customerName,
  loyaltyPointsUsed,
  accountCreditUsed,
  saleDate,
  soldBy,
  onConfirmSale,
  onPrintAndComplete,
}: PrintPreviewDialogProps) {
  const { t, formatCurrency } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.actualPrice * item.quantity,
    0,
  );
  const discountAmount = (subtotal * discountPercent) / 100;
  const loyaltyDiscount = loyaltyPointsUsed / 100;
  const total = subtotal - discountAmount - loyaltyDiscount - accountCreditUsed;

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt - LUXA</title>
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  padding: 20px;
                  max-width: 400px;
                  margin: 0 auto;
                  font-size: 12px;
                }
                .header {
                  text-align: center;
                  border-bottom: 2px dashed #000;
                  padding-bottom: 10px;
                  margin-bottom: 15px;
                }
                .header h1 {
                  margin: 0;
                  font-size: 24px;
                  font-weight: bold;
                }
                .header p {
                  margin: 5px 0;
                }
                .info-section {
                  margin-bottom: 15px;
                  border-bottom: 1px dashed #000;
                  padding-bottom: 10px;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 3px 0;
                }
                .items-section {
                  margin-bottom: 15px;
                  border-bottom: 2px dashed #000;
                  padding-bottom: 10px;
                }
                .item-row {
                  margin: 8px 0;
                }
                .item-name {
                  font-weight: bold;
                }
                .item-details {
                  display: flex;
                  justify-content: space-between;
                  color: #666;
                  font-size: 11px;
                }
                .totals-section {
                  margin-bottom: 15px;
                }
                .total-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 5px 0;
                }
                .total-row.grand-total {
                  font-size: 16px;
                  font-weight: bold;
                  border-top: 2px solid #000;
                  padding-top: 8px;
                  margin-top: 8px;
                }
                .footer {
                  text-align: center;
                  margin-top: 20px;
                  border-top: 2px dashed #000;
                  padding-top: 10px;
                }
                @media print {
                  body {
                    padding: 10px;
                  }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      cash: t("Cash"),
      card: t("Card"),
      transfer: t("Transfer"),
      split: t("Split Payment"),
      account: t("Customer Account"),
    };
    return methods[method] || method;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Print Preview")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Receipt Preview */}
          <div
            ref={printRef}
            className="bg-white p-6 rounded-lg border font-mono text-sm"
          >
            {/* Header */}
            <div className="header text-center border-b-2 border-dashed border-gray-800 pb-4 mb-4">
              <h1 className="text-2xl font-bold mb-2">LUXA</h1>
              <p className="text-xs">{t("Sales Management System")}</p>
              <p className="text-xs mt-2">
                {new Date(saleDate).toLocaleDateString()} -{" "}
                {new Date().toLocaleTimeString()}
              </p>
            </div>

            {/* Info Section */}
            <div className="info-section border-b border-dashed border-gray-800 pb-3 mb-4 text-xs">
              <div className="info-row flex justify-between">
                <span>{t("Receipt")} #:</span>
                <span className="font-bold">{Date.now()}</span>
              </div>
              <div className="info-row flex justify-between">
                <span>{t("Sold By")}:</span>
                <span>{soldBy}</span>
              </div>
              {customerName && (
                <div className="info-row flex justify-between">
                  <span>{t("Customer")}:</span>
                  <span>{customerName}</span>
                </div>
              )}
              <div className="info-row flex justify-between">
                <span>{t("Payment")}:</span>
                <span>{formatPaymentMethod(paymentMethod)}</span>
              </div>
            </div>

            {/* Items */}
            <div className="items-section border-b-2 border-dashed border-gray-800 pb-3 mb-4">
              {cart.map((item, idx) => (
                <div key={idx} className="item-row mb-3">
                  <div className="item-name font-bold">{item.name}</div>
                  <div className="item-details flex justify-between text-xs text-gray-600">
                    <span>
                      {item.quantity} x {formatCurrency(item.actualPrice)}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(item.actualPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="totals-section">
              <div className="total-row flex justify-between text-sm">
                <span>{t("Subtotal")}:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="total-row flex justify-between text-sm">
                  <span>
                    {t("Discount")} ({discountPercent}%):
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {loyaltyPointsUsed > 0 && (
                <div className="total-row flex justify-between text-sm">
                  <span>{t("Loyalty Points")}:</span>
                  <span>-{formatCurrency(loyaltyDiscount)}</span>
                </div>
              )}
              {accountCreditUsed > 0 && (
                <div className="total-row flex justify-between text-sm">
                  <span>{t("Account Credit")}:</span>
                  <span>-{formatCurrency(accountCreditUsed)}</span>
                </div>
              )}
              <div className="total-row grand-total flex justify-between text-lg font-bold border-t-2 border-gray-900 pt-2 mt-2">
                <span>{t("TOTAL")}:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Split Payment Details */}
            {paymentMethod === "split" &&
              splitPayments &&
              splitPayments.length > 0 && (
                <div className="mt-4 pt-3 border-t border-dashed border-gray-800 text-xs">
                  <div className="font-bold mb-2">
                    {t("Payment Breakdown")}:
                  </div>
                  {splitPayments.map((payment, idx) => (
                    <div key={idx} className="flex justify-between mb-1">
                      <span className="capitalize">{payment.method}:</span>
                      <span>{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

            {/* Footer */}
            <div className="footer text-center mt-6 pt-4 border-t-2 border-dashed border-gray-800 text-xs">
              <p className="font-bold mb-1">
                {t("Thank you for your purchase!")}
              </p>
              <p>{t("Please keep this receipt for your records")}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              {t("Cancel")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onConfirmSale();
                onOpenChange(false);
              }}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              {t("Complete Without Print")}
            </Button>
            <Button
              onClick={() => {
                handlePrint();
                onPrintAndComplete();
                onOpenChange(false);
              }}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              {t("Print & Complete")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
