import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Truck, Package, CheckCircle, AlertTriangle } from "lucide-react";
import ImageDisplay from "./ImageDisplay";
import { cn } from "@/lib/utils";
import { InventoryItem } from "@/types/inventoryTypes";
import { useLanguage } from "@/contexts/LanguageContext";
import { statusConfig } from "./inventoryConfig";

interface ItemBasicInfoCardProps {
  item: InventoryItem;
}

export default function ItemBasicInfoCard({ item }: ItemBasicInfoCardProps) {
  const { t } = useLanguage();
  const StatusIcon = statusConfig[item.status].icon;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="aspect-square relative bg-muted rounded-xl overflow-hidden mb-4">
          <ImageDisplay
            src={item.image || ""}
            alt={item.name}
            className="w-full h-full"
          />
        </div>
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {item.name}
            </h1>
            <Badge
              variant="outline"
              className={cn("gap-2", statusConfig[item.status].className)}
            >
              <StatusIcon className="w-3 h-3" />
              {t(statusConfig[item.status].label)}
            </Badge>
          </div>

          <div className="pt-4 border-t space-y-2">
            {item.createdByName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {t("Added by")}
                </span>
                <span className="text-sm font-medium">{item.createdByName}</span>
              </div>
            )}
            {item.confirmedByName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {t("Confirmed by")}
                </span>
                <span className="text-sm font-medium">
                  {item.confirmedByName}
                </span>
              </div>
            )}
            {item.confirmedAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("Confirmed on")}
                </span>
                <span className="text-sm font-medium">
                  {new Date(item.confirmedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("Category")}
              </span>
              <div className="flex flex-wrap gap-1 justify-end">
                {item.category.map((category) => (
                  <Badge key={category} variant="secondary">
                    {t(category)}
                  </Badge>
                ))}
              </div>
            </div>
            {item.barcode && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("Barcode")}
                </span>
                <span className="text-sm font-mono font-medium">
                  {item.barcode}
                </span>
              </div>
            )}
            {item.sku && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("SKU")}
                </span>
                <span className="text-sm font-mono font-medium">
                  {item.sku}
                </span>
              </div>
            )}
            {item.supplier && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {t("Supplier")}
                </span>
                <span className="text-sm font-medium">{item.supplier}</span>
              </div>
            )}
            {item.lastRestocked && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {t("Last Restocked")}
                </span>
                <span className="text-sm font-medium">
                  {new Date(item.lastRestocked).toLocaleDateString()}
                </span>
              </div>
            )}
            {item.bundleQuantity && item.bundlePrice && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("Bundle Offer")}
                </span>
                <span className="text-sm font-medium">
                  {t("{qty} for {price}", {
                    values: {
                      qty: item.bundleQuantity,
                      price: new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      }).format(item.bundlePrice),
                    },
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StockAlertCardProps {
  item: InventoryItem;
}

export function StockAlertCard({ item }: StockAlertCardProps) {
  const { t } = useLanguage();

  if (item.status !== "low-stock" || !item.reorderPoint) return null;

  return (
    <Card className="border-warning">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-warning">
          <AlertTriangle className="w-4 h-4" />
          {t("Low Stock Alert")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {t(
            "Stock is below reorder point of {point} units. Consider restocking soon.",
            { values: { point: item.reorderPoint } },
          )}
        </p>
      </CardContent>
    </Card>
  );
}

interface PricingCardProps {
  item: InventoryItem;
  userRole: string;
}

export function PricingCard({ item, userRole }: PricingCardProps) {
  const { t, formatCurrency } = useLanguage();

  if (userRole !== "owner") return null;

  const markup =
    item.wholesalePrice > 0
      ? ((item.sellingPrice - item.wholesalePrice) / item.wholesalePrice) * 100
      : 0;
  const profitMargin =
    item.sellingPrice > 0
      ? ((item.sellingPrice - item.wholesalePrice) / item.sellingPrice) * 100
      : 0;

  const getMarginColor = (margin: number) => {
    if (margin < 10) return "text-destructive";
    if (margin < 20) return "text-warning";
    return "text-success";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Pricing Analysis")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("Markup")}</p>
            <p className={`text-2xl font-bold ${getMarginColor(markup)}`}>
              {markup.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {t("Profit Margin")}
            </p>
            <p className={`text-2xl font-bold ${getMarginColor(profitMargin)}`}>
              {profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="border-t pt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("Cost Price")}</span>
            <span className="font-medium">
              {formatCurrency(item.wholesalePrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("Selling Price")}</span>
            <span className="font-medium text-accent">
              {formatCurrency(item.sellingPrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("Profit per Unit")}
            </span>
            <span className={`font-bold ${getMarginColor(profitMargin)}`}>
              {formatCurrency(item.sellingPrice - item.wholesalePrice)}
            </span>
          </div>
        </div>
        {item.bundleQuantity && item.bundlePrice && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">
              {t("Bundle Offer")}
            </p>
            <div className="bg-success/10 border border-success/20 rounded-lg p-3">
              <p className="text-sm font-semibold">
                {t("Buy {qty} for {price}", {
                  values: {
                    qty: item.bundleQuantity,
                    price: formatCurrency(item.bundlePrice),
                  },
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("Save {amount}", {
                  values: {
                    amount: formatCurrency(
                      item.bundleQuantity * item.sellingPrice -
                        item.bundlePrice,
                    ),
                  },
                })}{" "}
                (
                {(
                  ((item.bundleQuantity * item.sellingPrice -
                    item.bundlePrice) /
                    (item.bundleQuantity * item.sellingPrice)) *
                  100
                ).toFixed(1)}
                % {t("off")})
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



