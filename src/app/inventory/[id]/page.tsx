"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import ItemBasicInfoCard, {
  StockAlertCard,
} from "@/components/inventory/ItemDetailCards";
import ItemMetricsGrid from "@/components/inventory/ItemMetricsGrid";
import SalesTrendChart, {
  QuickActionsCard,
} from "@/components/inventory/ItemCharts";
import { generateSalesTrend } from "@/components/inventory/inventoryConfig";

export default function InventoryItemDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { inventory } = useInventoryData();
  const { t, formatCurrency } = useLanguage();

  const item = useMemo(
    () => inventory.find((i) => i.id === id),
    [inventory, id],
  );

  if (!item) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t("Item not found")}
          </h2>
          <p className="text-muted-foreground mb-6">
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
        <Button className="gap-2">
          <Edit className="w-4 h-4" />
          {t("Edit Item")}
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Image and Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <ItemBasicInfoCard item={item} />
          <StockAlertCard item={item} />
        </div>

        {/* Right Column - Details and Analytics */}
        <div className="lg:col-span-2 space-y-6">
          <ItemMetricsGrid {...metricsData} />
          <SalesTrendChart salesTrend={salesTrend} />
          <QuickActionsCard />
        </div>
      </div>
    </div>
  );
}
