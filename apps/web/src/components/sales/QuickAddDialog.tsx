"use client";

import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { SaleItem } from "@/types/salesTypes";

interface QuickAddDialogProps {
  open: boolean;
  item: SaleItem | null;
  quantity: string;
  onQuantityChange: (quantity: string) => void;
  onAdd: () => void;
  onClose: () => void;
}

export default function QuickAddDialog({
  open,
  item,
  quantity,
  onQuantityChange,
  onAdd,
  onClose,
}: QuickAddDialogProps) {
  const { t, formatCurrency } = useLanguage();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Add to Cart")}</DialogTitle>
          <DialogDescription>
            {item && (
              <span className="font-medium text-foreground">
                {item.name} - {formatCurrency(item.sellingPrice)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">{t("Quantity")}</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={item?.availableQty || 1}
              value={quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
              autoFocus
              onKeyDown={handleKeyDown}
            />
            <p className="text-xs text-muted-foreground">
              {t("Available")}: {item?.availableQty || 0}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 mr-2" />
            {t("Add to Cart")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



