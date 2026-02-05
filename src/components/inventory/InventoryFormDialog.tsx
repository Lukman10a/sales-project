import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";
import { categories } from "@/data/inventory";
import { useEffect, useState } from "react";

interface InventoryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  item: Omit<InventoryItem, "id">;
  onItemChange: (item: Omit<InventoryItem, "id">) => void;
  onSave: () => void;
  onCancel: () => void;
  saveDisabled?: boolean;
  validation?: {
    nameError?: string;
    priceError?: string;
    reorderError?: string;
    barcodeError?: string;
  };
}

export default function InventoryFormDialog({
  isOpen,
  onOpenChange,
  title,
  item,
  onItemChange,
  onSave,
  onCancel,
  saveDisabled,
  validation,
}: InventoryFormDialogProps) {
  const { t } = useLanguage();
  const [categoryInput, setCategoryInput] = useState("");
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const categorySuggestions = categories.filter(
    (category) => category !== "All",
  );

  useEffect(() => {
    if (!isOpen) setCategoryInput("");
  }, [isOpen]);

  // Barcode scanner listener (keyboard wedge)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTime;

      // If more than 100ms between keys, reset buffer (human typing)
      if (timeDiff > 100) {
        setBarcodeBuffer("");
      }

      // Accumulate characters for barcode (fast input from scanner)
      if (e.key === "Enter" && barcodeBuffer.length > 0) {
        // Barcode scanner sends Enter after barcode
        e.preventDefault();
        onItemChange({ ...item, barcode: barcodeBuffer.trim() });
        setBarcodeBuffer("");
      } else if (e.key.length === 1 && timeDiff < 100) {
        // Fast keypresses indicate scanner input
        setBarcodeBuffer((prev) => prev + e.key);
      }

      setLastKeyTime(now);
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [isOpen, barcodeBuffer, lastKeyTime, item, onItemChange]);

  const normalizeCategory = (value: string) => value.trim();
  const hasCategory = (value: string) =>
    item.category.some(
      (existing) => existing.toLowerCase() === value.toLowerCase(),
    );
  const addCategory = (value: string) => {
    const nextCategory = normalizeCategory(value);
    if (!nextCategory || hasCategory(nextCategory)) return;
    onItemChange({ ...item, category: [...item.category, nextCategory] });
    setCategoryInput("");
  };
  const removeCategory = (value: string) => {
    onItemChange({
      ...item,
      category: item.category.filter((category) => category !== value),
    });
  };

  // Calculate markup percentage and profit margin
  const markup =
    item.wholesalePrice > 0
      ? ((item.sellingPrice - item.wholesalePrice) / item.wholesalePrice) * 100
      : 0;
  const profitMargin =
    item.sellingPrice > 0
      ? ((item.sellingPrice - item.wholesalePrice) / item.sellingPrice) * 100
      : 0;
  const bundleDiscount =
    item.bundleQuantity && item.bundlePrice
      ? ((item.bundleQuantity * item.sellingPrice - item.bundlePrice) /
          (item.bundleQuantity * item.sellingPrice)) *
        100
      : 0;

  const getMarginColor = (margin: number) => {
    if (margin < 10) return "text-destructive";
    if (margin < 20) return "text-warning";
    return "text-success";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("Item Name")}</Label>
            <Input
              id="name"
              placeholder={t("e.g. Bluetooth Speaker")}
              value={item.name}
              onChange={(e) => onItemChange({ ...item, name: e.target.value })}
            />
            {validation?.nameError && (
              <p className="text-xs text-destructive">{validation.nameError}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="barcode">
              {t("Barcode")}{" "}
              <span className="text-muted-foreground text-xs">
                ({t("optional")})
              </span>
            </Label>
            <div className="relative">
              <Input
                id="barcode"
                placeholder={t("Scan or enter barcode")}
                value={item.barcode || ""}
                onChange={(e) =>
                  onItemChange({ ...item, barcode: e.target.value })
                }
              />
              {barcodeBuffer && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {t("Scanning...")}
                </span>
              )}
            </div>
            {validation?.barcodeError && (
              <p className="text-xs text-destructive">
                {validation.barcodeError}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">{t("Category")}</Label>
            <div className="flex flex-wrap gap-2">
              {item.category.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  {t("No categories selected")}
                </span>
              ) : (
                item.category.map((category) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {t(category)}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => removeCategory(category)}
                      aria-label={t("Remove category")}
                    >
                      x
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                id="category"
                placeholder={t("Add a category")}
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory(categoryInput);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addCategory(categoryInput)}
              >
                {t("Add")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categorySuggestions.map((category) => (
                <Button
                  key={category}
                  type="button"
                  size="sm"
                  variant={hasCategory(category) ? "secondary" : "outline"}
                  onClick={() => addCategory(category)}
                  disabled={hasCategory(category)}
                >
                  {t(category)}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="image">{t("Image URL (optional)")}</Label>
            <Input
              id="image"
              placeholder="https://..."
              value={item.image}
              onChange={(e) => onItemChange({ ...item, image: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="wholesale">{t("Cost Price (NGN)")}</Label>
              <Input
                id="wholesale"
                type="number"
                min={0}
                value={item.wholesalePrice}
                onChange={(e) =>
                  onItemChange({
                    ...item,
                    wholesalePrice: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="selling">{t("Selling Price (NGN)")}</Label>
              <Input
                id="selling"
                type="number"
                min={0}
                value={item.sellingPrice}
                onChange={(e) =>
                  onItemChange({
                    ...item,
                    sellingPrice: Number(e.target.value) || 0,
                  })
                }
              />
              {validation?.priceError && (
                <p className="text-xs text-destructive">
                  {validation.priceError}
                </p>
              )}
            </div>
          </div>
          {/* Markup & Profit Margin Display */}
          {item.wholesalePrice > 0 &&
            item.sellingPrice > item.wholesalePrice && (
              <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t("Markup")}</p>
                  <p className={`text-lg font-bold ${getMarginColor(markup)}`}>
                    {markup.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("Profit Margin")}
                  </p>
                  <p
                    className={`text-lg font-bold ${getMarginColor(profitMargin)}`}
                  >
                    {profitMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          {/* Bundle Pricing */}
          <div className="border-t pt-4">
            <Label className="text-sm font-semibold">
              {t("Bundle Pricing")}{" "}
              <span className="text-muted-foreground text-xs">
                ({t("optional")})
              </span>
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              {t("Offer discounts for bulk purchases")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="bundleQty">{t("Bundle Quantity")}</Label>
                <Input
                  id="bundleQty"
                  type="number"
                  min={2}
                  placeholder="e.g. 3"
                  value={item.bundleQuantity || ""}
                  onChange={(e) =>
                    onItemChange({
                      ...item,
                      bundleQuantity: Number(e.target.value) || undefined,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bundlePrice">{t("Bundle Price (NGN)")}</Label>
                <Input
                  id="bundlePrice"
                  type="number"
                  min={0}
                  placeholder="e.g. 10000"
                  value={item.bundlePrice || ""}
                  onChange={(e) =>
                    onItemChange({
                      ...item,
                      bundlePrice: Number(e.target.value) || undefined,
                    })
                  }
                />
              </div>
            </div>
            {item.bundleQuantity && item.bundlePrice && bundleDiscount > 0 && (
              <div className="mt-2 bg-success/10 border border-success/20 rounded-lg p-2">
                <p className="text-xs text-success font-medium">
                  {t("Bundle saves {discount}% ({amount} off)", {
                    values: {
                      discount: bundleDiscount.toFixed(1),
                      amount: Math.round(
                        item.bundleQuantity * item.sellingPrice -
                          item.bundlePrice,
                      ).toLocaleString(),
                    },
                  })}
                </p>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reorderPoint">
              {t("Minimum Reorder Quantity")}
            </Label>
            <Input
              id="reorderPoint"
              type="number"
              min={0}
              value={item.reorderPoint ?? 0}
              onChange={(e) =>
                onItemChange({
                  ...item,
                  reorderPoint: Number(e.target.value) || 0,
                })
              }
            />
            {validation?.reorderError && (
              <p className="text-xs text-destructive">
                {validation.reorderError}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="qty">{t("Quantity")}</Label>
              <Input
                id="qty"
                type="number"
                min={0}
                value={item.quantity}
                onChange={(e) =>
                  onItemChange({
                    ...item,
                    quantity: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("Status")}</Label>
              <Select
                value={item.status}
                onValueChange={(value: InventoryItem["status"]) =>
                  onItemChange({
                    ...item,
                    status: value as InventoryItem["status"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("Select status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-stock">{t("In Stock")}</SelectItem>
                  <SelectItem value="low-stock">{t("Low Stock")}</SelectItem>
                  <SelectItem value="out-of-stock">
                    {t("Out of Stock")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("Cancel")}
          </Button>
          <Button onClick={onSave} disabled={saveDisabled}>
            {t("Save Changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
