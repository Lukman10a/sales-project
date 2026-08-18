"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CartItem, SaleItem, PaymentPart } from "@/types/salesTypes";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { useSalesData } from "@/contexts/SalesDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/usePermissions";
import { categories } from "@/data/inventory";
import ProductSearchBar from "@/components/sales/ProductSearchBar";
import CategoryFilters from "@/components/sales/CategoryFilters";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

const ProductsGrid = dynamic(() => import("@/components/sales/ProductsGrid"), {
  ssr: false,
  loading: () => null,
});
const RecentSalesList = dynamic(
  () => import("@/components/sales/RecentSalesList"),
  { ssr: false, loading: () => null },
);
const CartSidebar = dynamic(() => import("@/components/sales/CartSidebar"), {
  ssr: false,
  loading: () => null,
});
const QuickAddDialog = dynamic(
  () => import("@/components/sales/QuickAddDialog"),
  { ssr: false, loading: () => null },
);
const SplitPaymentModal = dynamic(
  () => import("@/components/sales/SplitPaymentModal"),
  { ssr: false, loading: () => null },
);
const CustomerAccountModal = dynamic(
  () => import("@/components/sales/CustomerAccountModal"),
  { ssr: false, loading: () => null },
);
const SaleDateModal = dynamic(
  () => import("@/components/sales/SaleDateModal"),
  { ssr: false, loading: () => null },
);
const RefundModal = dynamic(() => import("@/components/sales/RefundModal"), {
  ssr: false,
  loading: () => null,
});
const PrintPreviewDialog = dynamic(
  () => import("@/components/sales/PrintPreviewDialog"),
  { ssr: false, loading: () => null },
);

export default function Sales() {
  const { user } = useAuth();
  const { hasPermission, isOwner } = usePermissions();
  const { inventory: allProducts, decrementInventory } = useInventoryData();
  const { addSaleRecord, recentSales } = useSalesData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "transfer" | "split" | "account"
  >("cash");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [quickAddDialog, setQuickAddDialog] = useState<{
    open: boolean;
    item: SaleItem | null;
  }>({ open: false, item: null });
  const [quickQuantity, setQuickQuantity] = useState("1");

  // New feature states
  const [splitPayments, setSplitPayments] = useState<PaymentPart[]>([]);
  const [splitPaymentOpen, setSplitPaymentOpen] = useState(false);
  const [customerAccountOpen, setCustomerAccountOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    name: string;
  } | null>(null);
  const [loyaltyPointsUsed, setLoyaltyPointsUsed] = useState(0);
  const [accountCreditUsed, setAccountCreditUsed] = useState(0);
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [saleDateOpen, setSaleDateOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);

  const { t, formatCurrency } = useLanguage();

  // Convert inventory items to SaleItem format for cart - memoized
  const products: SaleItem[] = useMemo(
    () =>
      allProducts.map((item) => ({
        id: item.id,
        name: item.name,
        image: item.image,
        sellingPrice: item.sellingPrice,
        availableQty: item.quantity,
      })),
    [allProducts],
  );

  const filteredItems = useMemo(
    () =>
      products.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [products, searchQuery],
  );

  const openQuickAddDialog = (item: SaleItem) => {
    setQuickAddDialog({ open: true, item });
    setQuickQuantity("1");
  };

  const handleQuickAdd = () => {
    if (!quickAddDialog.item) return;
    const qty = parseInt(quickQuantity) || 1;
    const item = quickAddDialog.item;

    if (qty > item.availableQty) {
      toast(t("Insufficient stock"));
      return;
    }

    const existingItem = cart.find((i) => i.id === item.id);
    if (existingItem) {
      const newQty = existingItem.quantity + qty;
      if (newQty > item.availableQty) {
        toast(t("Insufficient stock"));
        return;
      }
      setCart(
        cart.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)),
      );
    } else {
      setCart([
        ...cart,
        { ...item, quantity: qty, actualPrice: item.sellingPrice },
      ]);
    }

    setQuickAddDialog({ open: false, item: null });
    toast(t("Added to cart"));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.availableQty) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const updatePrice = (itemId: string, price: number) => {
    setCart(
      cart.map((item) =>
        item.id === itemId ? { ...item, actualPrice: price } : item,
      ),
    );
  };

  const handleApplySplitPayment = (payments: PaymentPart[]) => {
    setSplitPayments(payments);
    setPaymentMethod("split");
    toast(t("Split payment configured"));
  };

  const handleApplyCustomerAccount = (
    customer: { name: string } | null,
    loyaltyPoints: number,
    accountCredit: number,
  ) => {
    setSelectedCustomer(customer);
    setLoyaltyPointsUsed(loyaltyPoints);
    setAccountCreditUsed(accountCredit);
    if (customer) {
      setPaymentMethod("account");
      toast(t("Customer selected") + ": " + customer.name);
    }
  };

  const handleApplySaleDate = (date: string) => {
    setSaleDate(date);
    toast(t("Sale date updated"));
  };

  const handleProcessRefund = (
    saleId: string,
    refundAmount: number,
    reason: string,
  ) => {
    // Find the original sale and process refund
    const originalSale = recentSales.find((s) => s.id === saleId);
    if (originalSale) {
      const refundRecord = {
        id: String(Date.now()),
        items: originalSale.items,
        total: refundAmount,
        soldBy: originalSale.soldBy,
        time: "just now",
        status:
          refundAmount >= originalSale.total
            ? ("refunded" as const)
            : ("partial-refund" as const),
        refundReason: reason,
        refundAmount: refundAmount,
        originalSaleId: saleId,
      };
      addSaleRecord(refundRecord);
      toast(t("Refund processed successfully"));
    }
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      toast(t("Cart is empty"));
      return;
    }

    // Validate against current products stock
    for (const ci of cart) {
      const p = allProducts.find((p) => p.id === ci.id);
      if (!p || ci.quantity > p.quantity) {
        toast(
          t("Insufficient stock for {name}", { values: { name: ci.name } }),
        );
        return;
      }
    }

    // Open print preview instead of completing directly
    setPrintPreviewOpen(true);
  };

  const completeSaleDirectly = () => {
    const cartSubtotal = cart.reduce(
      (sum, item) => sum + item.actualPrice * item.quantity,
      0,
    );
    const cartDiscount = (cartSubtotal * discountPercent) / 100;
    const loyaltyDiscount = loyaltyPointsUsed / 100;
    const cartTotal =
      cartSubtotal - cartDiscount - loyaltyDiscount - accountCreditUsed;

    // Decrement inventory globally
    cart.forEach((item) => {
      decrementInventory(item.id, item.quantity);
    });

    // Create and add sale record globally
    const newRecord = {
      id: String(Date.now()),
      items: cart.map((c) => ({
        name: c.name,
        quantity: c.quantity,
        price: c.actualPrice,
      })),
      total: cartTotal,
      soldBy: user ? user.firstName : "You",
      time: "just now",
      status: "completed" as const,
      paymentMethod,
      discount: discountPercent,
      splitPayments: paymentMethod === "split" ? splitPayments : undefined,
      customerId: selectedCustomer ? "generated-id" : undefined,
      customerName: selectedCustomer?.name,
      loyaltyPointsUsed,
      accountCredit: accountCreditUsed,
      saleDate,
      saleTimestamp: new Date(saleDate).getTime(),
    };
    addSaleRecord(newRecord);

    // Clear cart and reset
    setCart([]);
    setSearchQuery("");
    setDiscountPercent(0);
    setPaymentMethod("cash");
    setSplitPayments([]);
    setSelectedCustomer(null);
    setLoyaltyPointsUsed(0);
    setAccountCreditUsed(0);
    setSaleDate(new Date().toISOString().split("T")[0]);

    toast(t("Sale completed"), {
      description: t("Total {amount}", {
        values: { amount: formatCurrency(cartTotal) },
        fallback: `${t("Total")}: ${formatCurrency(cartTotal)}`,
      }),
    });
  };

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header with Refund Button */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                  {t("Record Sale")}
                </h1>
                <p className="text-muted-foreground">
                  {t("Select items and record transactions")}
                </p>
              </div>
              <Button
                onClick={() => setRefundModalOpen(true)}
                variant="outline"
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {t("Refund")}
              </Button>
            </div>

            {/* Search */}
            <ProductSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Category Filters */}
            <CategoryFilters
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Products Grid */}
            <ProductsGrid
              products={filteredItems}
              cart={cart}
              onProductClick={openQuickAddDialog}
            />

            {/* Recent Sales - Only visible if user has permission */}
            {(isOwner() || hasPermission("view-sales-history")) && (
              <RecentSalesList sales={recentSales} />
            )}
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <CartSidebar
              cart={cart}
              discountPercent={discountPercent}
              paymentMethod={paymentMethod}
              onRemoveItem={removeFromCart}
              onUpdateQuantity={updateQuantity}
              onUpdatePrice={updatePrice}
              onDiscountChange={setDiscountPercent}
              onPaymentMethodChange={setPaymentMethod}
              onCompleteSale={handleCompleteSale}
              onOpenSplitPayment={() => setSplitPaymentOpen(true)}
              onOpenCustomerAccount={() => setCustomerAccountOpen(true)}
              onOpenDatePicker={() => setSaleDateOpen(true)}
              splitPayments={splitPayments}
              selectedCustomer={selectedCustomer}
              saleDate={saleDate}
            />
          </div>
        </div>
      </div>

      {/* Quick Add Dialog */}
      <QuickAddDialog
        open={quickAddDialog.open}
        item={quickAddDialog.item}
        quantity={quickQuantity}
        onQuantityChange={setQuickQuantity}
        onAdd={handleQuickAdd}
        onClose={() => setQuickAddDialog({ open: false, item: null })}
      />

      {/* Split Payment Modal */}
      <SplitPaymentModal
        open={splitPaymentOpen}
        total={
          cart.reduce(
            (sum, item) => sum + item.actualPrice * item.quantity,
            0,
          ) -
          (cart.reduce(
            (sum, item) => sum + item.actualPrice * item.quantity,
            0,
          ) *
            discountPercent) /
            100
        }
        onClose={() => setSplitPaymentOpen(false)}
        onApply={handleApplySplitPayment}
      />

      {/* Customer Account Modal */}
      <CustomerAccountModal
        open={customerAccountOpen}
        total={
          cart.reduce(
            (sum, item) => sum + item.actualPrice * item.quantity,
            0,
          ) -
          (cart.reduce(
            (sum, item) => sum + item.actualPrice * item.quantity,
            0,
          ) *
            discountPercent) /
            100
        }
        onClose={() => setCustomerAccountOpen(false)}
        onApply={handleApplyCustomerAccount}
      />

      {/* Sale Date Modal */}
      <SaleDateModal
        open={saleDateOpen}
        currentDate={saleDate}
        onClose={() => setSaleDateOpen(false)}
        onApply={handleApplySaleDate}
      />

      {/* Refund Modal */}
      <RefundModal
        open={refundModalOpen}
        recentSales={recentSales}
        onClose={() => setRefundModalOpen(false)}
        onProcessRefund={handleProcessRefund}
      />

      {/* Print Preview Dialog */}
      <PrintPreviewDialog
        open={printPreviewOpen}
        onOpenChange={setPrintPreviewOpen}
        cart={cart}
        discountPercent={discountPercent}
        paymentMethod={paymentMethod}
        splitPayments={splitPayments}
        customerName={selectedCustomer?.name}
        loyaltyPointsUsed={loyaltyPointsUsed}
        accountCreditUsed={accountCreditUsed}
        saleDate={saleDate}
        soldBy={user ? user.firstName : "Staff"}
        onConfirmSale={completeSaleDirectly}
        onPrintAndComplete={completeSaleDirectly}
      />
    </>
  );
}


