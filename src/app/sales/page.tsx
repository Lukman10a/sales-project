"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CartItem, SaleItem } from "@/types/salesTypes";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { useSalesData } from "@/contexts/SalesDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { categories } from "@/data/inventory";
import ProductSearchBar from "@/components/sales/ProductSearchBar";
import CategoryFilters from "@/components/sales/CategoryFilters";
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

export default function Sales() {
  const { user } = useAuth();
  const { inventory: allProducts, decrementInventory } = useInventoryData();
  const { addSaleRecord, recentSales } = useSalesData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "transfer"
  >("cash");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [quickAddDialog, setQuickAddDialog] = useState<{
    open: boolean;
    item: SaleItem | null;
  }>({ open: false, item: null });
  const [quickQuantity, setQuickQuantity] = useState("1");
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

    const cartSubtotal = cart.reduce(
      (sum, item) => sum + item.actualPrice * item.quantity,
      0,
    );
    const cartDiscount = (cartSubtotal * discountPercent) / 100;
    const cartTotal = cartSubtotal - cartDiscount;

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
    };
    addSaleRecord(newRecord);

    // Clear cart and reset
    setCart([]);
    setSearchQuery("");
    setDiscountPercent(0);
    setPaymentMethod("cash");

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
            {/* Header */}
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                {t("Record Sale")}
              </h1>
              <p className="text-muted-foreground">
                {t("Select items and record transactions")}
              </p>
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

            {/* Recent Sales */}
            <RecentSalesList sales={recentSales} />
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
    </>
  );
}
