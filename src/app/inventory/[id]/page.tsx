"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";
import { toast } from "@/components/ui/sonner";
import ItemBasicInfoCard, {
  StockAlertCard,
  PricingCard,
} from "@/components/inventory/ItemDetailCards";
import ItemMetricsGrid from "@/components/inventory/ItemMetricsGrid";
import SalesTrendChart, {
  QuickActionsCard,
} from "@/components/inventory/ItemCharts";
import { generateSalesTrend } from "@/components/inventory/inventoryConfig";

const InventoryFormDialog = dynamic(
  () => import("@/components/inventory/InventoryFormDialog"),
  { ssr: false, loading: () => null },
);

export default function InventoryItemDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { inventory, updateInventoryItem } = useInventoryData();
  const { t, formatCurrency } = useLanguage();
  const userRole = user?.role || "owner";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Omit<
    InventoryItem,
    "id"
  > | null>(null);

  const item = useMemo(
    () => inventory.find((i) => i.id === id),
    [inventory, id],
  );

  // Validation functions
  const normalizeName = (value: string) => value.trim().toLowerCase();
  const getNameError = (name: string, excludeId?: string) => {
    if (!name.trim()) return t("Please enter an item name");
    const normalized = normalizeName(name);
    const isDuplicate = inventory.some(
      (item) =>
        normalizeName(item.name) === normalized &&
        (!excludeId || item.id !== excludeId),
    );
    if (isDuplicate) return t("An item with this name already exists");
    return "";
  };
  const getPriceError = (wholesalePrice: number, sellingPrice: number) => {
    if (sellingPrice <= wholesalePrice)
      return t("Selling price must be greater than cost price");
    return "";
  };
  const getReorderError = (reorderPoint?: number) => {
    if (reorderPoint !== undefined && reorderPoint < 0)
      return t("Minimum reorder quantity cannot be negative");
    return "";
  };
  const getBarcodeError = (barcode?: string, excludeId?: string) => {
    if (!barcode || !barcode.trim()) return ""; // Optional field
    const normalized = barcode.trim();
    const isDuplicate = inventory.some(
      (item) =>
        item.barcode &&
        item.barcode.trim().toLowerCase() === normalized.toLowerCase() &&
        (!excludeId || item.id !== excludeId),
    );
    if (isDuplicate) return t("An item with this barcode already exists");
    return "";
  };

  const handleEditClick = () => {
    if (item) {
      const { id, ...itemWithoutId } = item;
      setEditingItem(itemWithoutId);
      setIsEditOpen(true);
    }
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    const nameError = getNameError(editingItem.name, id);
    if (nameError) {
      toast(nameError);
      return;
    }
    const priceError = getPriceError(
      editingItem.wholesalePrice,
      editingItem.sellingPrice,
    );
    if (priceError) {
      toast(priceError);
      return;
    }
    const reorderError = getReorderError(editingItem.reorderPoint);
    if (reorderError) {
      toast(reorderError);
      return;
    }
    const barcodeError = getBarcodeError(editingItem.barcode, id);
    if (barcodeError) {
      toast(barcodeError);
      return;
    }
    const trimmedName = editingItem.name.trim();
    updateInventoryItem(id, { ...editingItem, name: trimmedName });
    setIsEditOpen(false);
    setEditingItem(null);
    toast(t("Item updated successfully"));
  };

  if (!item) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-0">
        <div className="text-center py-12">
          <Package className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
            {t("Item not found")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            {t("The item you're looking for doesn't exist")}
          </p>
          <Button onClick={() => router.push("/inventory")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("Back to Inventory")}
          </Button>
        </div>
      </div>
    );
  }

  const profitMargin = item.sellingPrice - item.wholesalePrice;
  const profitPercentage = ((profitMargin / item.wholesalePrice) * 100).toFixed(
    1,
  );
  const totalRevenue = item.sold * item.sellingPrice;
  const totalProfit = item.sold * profitMargin;
  const salesTrend = generateSalesTrend(item.sold);

  const metricsData = {
    sellingPrice: formatCurrency(item.sellingPrice),
    wholesalePrice: formatCurrency(item.wholesalePrice),
    quantity: item.quantity,
    sold: item.sold,
    profitPercentage,
    profitMargin: formatCurrency(profitMargin),
    totalRevenue: formatCurrency(totalRevenue),
    totalProfit: formatCurrency(totalProfit),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push("/inventory")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Back to Inventory")}
        </Button>
        <Button onClick={handleEditClick} className="gap-2">
          <Edit className="w-4 h-4" />
          {t("Edit Item")}
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Image and Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <ItemBasicInfoCard item={item} />
          <PricingCard item={item} userRole={userRole} />
          <StockAlertCard item={item} />
        </div>

        {/* Right Column - Details and Analytics */}
        <div className="lg:col-span-2 space-y-6">
          <ItemMetricsGrid {...metricsData} />
          <SalesTrendChart salesTrend={salesTrend} />
          <QuickActionsCard />
        </div>
      </div>

      {/* Edit Item Dialog */}
      {editingItem && (
        <InventoryFormDialog
          isOpen={isEditOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsEditOpen(false);
              setEditingItem(null);
            }
          }}
          title={t("Edit Item")}
          item={editingItem}
          onItemChange={(item) => setEditingItem(item)}
          onSave={handleSaveEdit}
          onCancel={() => {
            setIsEditOpen(false);
            setEditingItem(null);
          }}
          saveDisabled={
            !editingItem?.name?.trim() ||
            !!getNameError(editingItem.name, id) ||
            !!getPriceError(
              editingItem.wholesalePrice,
              editingItem.sellingPrice,
            ) ||
            !!getReorderError(editingItem.reorderPoint) ||
            !!getBarcodeError(editingItem.barcode, id)
          }
          validation={{
            nameError: getNameError(editingItem.name, id),
            priceError: getPriceError(
              editingItem.wholesalePrice,
              editingItem.sellingPrice,
            ),
            reorderError: getReorderError(editingItem.reorderPoint),
            barcodeError: getBarcodeError(editingItem.barcode, id),
          }}
        />
      )}
    </div>
  );
}
