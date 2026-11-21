"use client";

import { useEffect, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { InventoryItem } from "@/types/inventoryTypes";

type Mode = "restock" | "adjust";

interface StockDialogProps {
  item: InventoryItem | null;
  onOpenChange: (open: boolean) => void;
  initialMode?: Mode;
}

/**
 * Changes a product's stock the only ways the API allows: a restock (stock
 * received) or an adjustment (a correction, which always needs a reason).
 */
export default function StockDialog({
  item,
  onOpenChange,
  initialMode = "restock",
}: StockDialogProps) {
  const { t } = useLanguage();
  const { restockItem, adjustStock } = useInventoryData();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"add" | "remove">("remove");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setMode(initialMode);
      setAmount("");
      setDirection("remove");
      setNote("");
    }
  }, [item, initialMode]);

  const qty = Number(amount);
  const validQty = Number.isInteger(qty) && qty > 0;
  const delta = mode === "restock" || direction === "add" ? qty : -qty;
  const after = item ? item.quantity + (validQty ? delta : 0) : 0;
  const error = !item
    ? ""
    : amount && !validQty
      ? t("Enter a whole number above 0")
      : validQty && after < 0
        ? t("Only {qty} in stock", { values: { qty: item.quantity } })
        : mode === "adjust" && validQty && !note.trim()
          ? t("Say why the stock is changing")
          : "";
  const canSave = Boolean(item) && validQty && !error && !saving;

  const save = async () => {
    if (!item || !canSave) return;
    setSaving(true);
    try {
      if (mode === "restock") {
        await restockItem(item.id, qty, note.trim() || undefined);
        toast(t("Added {qty} to {item}", { values: { qty, item: item.name } }));
      } else {
        await adjustStock(item.id, delta, note.trim());
        toast(t("Stock for {item} is now {qty}", {
          values: { item: item.name, qty: after },
        }));
      }
      onOpenChange(false);
    } catch {
      // The API error is already shown as a toast.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("Change stock")}</DialogTitle>
          <DialogDescription>
            {item?.name} · {t("{qty} in stock", { values: { qty: item?.quantity ?? 0 } })}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="restock">{t("Restock")}</TabsTrigger>
            <TabsTrigger value="adjust">{t("Adjust")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-4 py-2">
          {mode === "adjust" && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={direction === "remove" ? "default" : "outline"}
                onClick={() => setDirection("remove")}
              >
                {t("Remove stock")}
              </Button>
              <Button
                type="button"
                variant={direction === "add" ? "default" : "outline"}
                onClick={() => setDirection("add")}
              >
                {t("Add stock")}
              </Button>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="stock-qty">
              {mode === "restock" ? t("Quantity received") : t("Quantity")}
            </Label>
            <Input
              id="stock-qty"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="stock-note">
              {mode === "restock" ? t("Note (optional)") : t("Reason")}
            </Label>
            <Input
              id="stock-note"
              maxLength={500}
              placeholder={
                mode === "restock"
                  ? t("e.g. Delivery from supplier")
                  : t("e.g. Damaged, stock count, expired")
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {validQty && !error && (
            <p className="text-sm text-muted-foreground">
              {t("Stock after: {qty}", { values: { qty: after } })}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {saving ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
