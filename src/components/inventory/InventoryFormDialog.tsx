import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { InventoryItem } from "@/types/inventoryTypes";
import { categories } from "@/data/inventory";
import { useEffect, useState } from "react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import BasicInfoSection from "./form-sections/BasicInfoSection";
import CategorySection from "./form-sections/CategorySection";
import MediaSection from "./form-sections/MediaSection";
import PricingSection from "./form-sections/PricingSection";
import BundlePricingSection from "./form-sections/BundlePricingSection";
import InventorySection from "./form-sections/InventorySection";

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
  const categorySuggestions = categories.filter((c) => c !== "All");

  const barcodeBuffer = useBarcodeScanner(isOpen, item, onItemChange);

  useEffect(() => {
    if (!isOpen) setCategoryInput("");
  }, [isOpen]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto rounded-2xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-6 px-2">
          <BasicInfoSection
            item={item}
            onItemChange={onItemChange}
            barcodeBuffer={barcodeBuffer}
            validation={{
              nameError: validation?.nameError,
              barcodeError: validation?.barcodeError,
            }}
          />

          <CategorySection
            item={item}
            onItemChange={onItemChange}
            categoryInput={categoryInput}
            setCategoryInput={setCategoryInput}
            categorySuggestions={categorySuggestions}
            addCategory={addCategory}
            removeCategory={removeCategory}
            hasCategory={hasCategory}
          />

          <MediaSection item={item} onItemChange={onItemChange} />

          <PricingSection
            item={item}
            onItemChange={onItemChange}
            validation={{ priceError: validation?.priceError }}
          />

          <BundlePricingSection item={item} onItemChange={onItemChange} />

          <InventorySection
            item={item}
            onItemChange={onItemChange}
            validation={{ reorderError: validation?.reorderError }}
          />
        </div>
        <DialogFooter className="border-t pt-6 gap-3">
          <Button variant="outline" onClick={onCancel} className="px-8">
            {t("Cancel")}
          </Button>
          <Button onClick={onSave} disabled={saveDisabled} className="px-8">
            {t("Save Changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
