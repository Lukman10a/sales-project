"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useInventoryData } from "@/contexts/InventoryDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Filter, Grid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { InventoryItem } from "@/types/inventoryTypes";
import { toast } from "@/components/ui/sonner";
import StockAlerts from "@/components/inventory/StockAlerts";
import { categories } from "@/data/inventory";
const InventoryFilters = dynamic(
  () => import("@/components/inventory/InventoryFilters"),
  { ssr: false, loading: () => null },
);
const InventoryFormDialog = dynamic(
  () => import("@/components/inventory/InventoryFormDialog"),
  { ssr: false, loading: () => null },
);
const InventoryStats = dynamic(
  () => import("@/components/inventory/InventoryStats"),
  { ssr: false, loading: () => null },
);
const InventoryGridItem = dynamic(
  () => import("@/components/inventory/InventoryGridItem"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-card rounded-2xl border card-elevated p-4 animate-pulse">
        <div className="aspect-square bg-muted rounded-xl" />
        <div className="mt-4 space-y-2">
          <div className="h-4 bg-muted rounded" />
          <div className="h-3 bg-muted/70 rounded w-2/3" />
        </div>
      </div>
    ),
  },
);
const InventoryListItem = dynamic(
  () => import("@/components/inventory/InventoryListItem"),
  {
    ssr: false,
    loading: () => (
      <tr className="border-b">
        <td className="p-4" colSpan={6}>
          <div className="h-6 bg-muted rounded animate-pulse" />
        </td>
      </tr>
    ),
  },
);
import { emptyNewItem } from "@/components/inventory/inventoryConfig";

export default function Inventory() {
  const { user } = useAuth();
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    confirmInventoryReceipt,
  } = useInventoryData();
  const { addNotification } = useNotifications();
  const userRole = user?.role || "owner";
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("name");
  const [confirmationFilter, setConfirmationFilter] = useState<
    "all" | "unconfirmed" | "confirmed"
  >(userRole === "apprentice" ? "unconfirmed" : "all");
  const [showFilters, setShowFilters] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Omit<
    InventoryItem,
    "id"
  > | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] =
    useState<Omit<InventoryItem, "id">>(emptyNewItem);
  const { t, formatCurrency, isRTL } = useLanguage();

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

  const filteredItems = useMemo(() => {
    let items = inventory.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // Filter by confirmation status for staff
    if (confirmationFilter === "unconfirmed") {
      items = items.filter((item) => !item.confirmedByApprentice);
    } else if (confirmationFilter === "confirmed") {
      items = items.filter((item) => item.confirmedByApprentice);
    }

    if (filterStatus !== "all")
      items = items.filter((item) => item.status === filterStatus);
    if (filterCategory !== "All")
      items = items.filter((item) => item.category.includes(filterCategory));

    items = [...items].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-asc":
          return a.sellingPrice - b.sellingPrice;
        case "price-desc":
          return b.sellingPrice - a.sellingPrice;
        case "quantity-asc":
          return a.quantity - b.quantity;
        case "quantity-desc":
          return b.quantity - a.quantity;
        case "sold-desc":
          return b.sold - a.sold;
        default:
          return 0;
      }
    });

    return items;
  }, [
    inventory,
    searchQuery,
    filterStatus,
    filterCategory,
    sortBy,
    confirmationFilter,
  ]);

  const categoryOptions = useMemo(() => {
    const baseCategories = categories.filter((category) => category !== "All");
    const dynamicCategories = inventory.flatMap((item) => item.category);
    const unique = Array.from(
      new Set(
        [...baseCategories, ...dynamicCategories]
          .map((category) => category.trim())
          .filter(Boolean),
      ),
    );
    return ["All", ...unique];
  }, [inventory]);

  const handleAddItem = () => {
    const nameError = getNameError(newItem.name);
    if (nameError) {
      toast(nameError);
      return;
    }
    const priceError = getPriceError(
      newItem.wholesalePrice,
      newItem.sellingPrice,
    );
    if (priceError) {
      toast(priceError);
      return;
    }
    const reorderError = getReorderError(newItem.reorderPoint);
    if (reorderError) {
      toast(reorderError);
      return;
    }
    const barcodeError = getBarcodeError(newItem.barcode);
    if (barcodeError) {
      toast(barcodeError);
      return;
    }
    const trimmedName = newItem.name.trim();

    const itemToAdd: InventoryItem = {
      ...newItem,
      id: `${Date.now()}`,
      name: trimmedName,
      image:
        newItem.image.trim() ||
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
    };

    addInventoryItem(itemToAdd);

    // Notify staff about new item
    if (userRole === "owner") {
      addNotification({
        type: "inventory",
        title: "New Items Added by Owner",
        message: `${user?.firstName || "Owner"} added "${trimmedName}" (${itemToAdd.quantity} units) to inventory. Please confirm receipt and update shelf location.`,
        time: "just now",
        read: false,
        actionable: true,
        relatedItemId: itemToAdd.id,
        actionType: "confirm",
      });
    }

    setNewItem(emptyNewItem);
    setIsAddOpen(false);
    toast(t("Item added successfully"));
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditingItem({
      name: item.name,
      category: item.category,
      image: item.image,
      wholesalePrice: item.wholesalePrice,
      sellingPrice: item.sellingPrice,
      quantity: item.quantity,
      sold: item.sold,
      status: item.status,
      confirmedByApprentice: item.confirmedByApprentice,
      reorderPoint: item.reorderPoint ?? 0,
      barcode: item.barcode || "",
      bundleQuantity: item.bundleQuantity,
      bundlePrice: item.bundlePrice,
    });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingItem) return;
    const nameError = getNameError(editingItem.name, editingId);
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
    const barcodeError = getBarcodeError(editingItem.barcode, editingId);
    if (barcodeError) {
      toast(barcodeError);
      return;
    }
    const trimmedName = editingItem.name.trim();
    updateInventoryItem(editingId, { ...editingItem, name: trimmedName });
    setEditingId(null);
    setEditingItem(null);
    toast(t("Item updated successfully"));
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteInventoryItem(deleteTarget.id);
    toast(t("Item deleted successfully"));
    setDeleteTarget(null);
  };

  const handleConfirmReceipt = (itemId: string, itemName: string) => {
    confirmInventoryReceipt(itemId);
    toast(t("Receipt confirmed for {item}", { values: { item: itemName } }));
  };

  const statsData = {
    totalItems: inventory.length,
    inStock: inventory.filter((i) => i.status === "in-stock").length,
    lowStock: inventory.filter((i) => i.status === "low-stock").length,
    outOfStock: inventory.filter((i) => i.status === "out-of-stock").length,
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              {t("Inventory")}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t("Manage your products and stock levels")}
            </p>
          </div>
          {userRole === "owner" && (
            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-gradient-accent text-accent-foreground hover:opacity-90 glow-accent w-full sm:w-auto"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("Add New Item")}
            </Button>
          )}
        </div>

        {/* Stock Alerts */}
        <StockAlerts />

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Confirmation Filter for Staff */}
          {userRole === "apprentice" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <label className="text-sm font-medium text-foreground">
                  {t("Show Items")}:
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={
                      confirmationFilter === "unconfirmed"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => setConfirmationFilter("unconfirmed")}
                  >
                    {t("Unconfirmed")}{" "}
                    <Badge variant="secondary" className="ml-2">
                      {inventory.filter((i) => !i.confirmedByApprentice).length}
                    </Badge>
                  </Button>
                  <Button
                    variant={
                      confirmationFilter === "all" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setConfirmationFilter("all")}
                  >
                    {t("All Items")}
                  </Button>
                  <Button
                    variant={
                      confirmationFilter === "confirmed" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setConfirmationFilter("confirmed")}
                  >
                    {t("Confirmed")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search
                className={
                  isRTL
                    ? "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                    : "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                }
              />
              <Input
                placeholder={t("Search items...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "pr-10" : "pl-10"}
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="icon"
                className="flex-shrink-0"
                onClick={() => setShowFilters((prev) => !prev)}
              >
                <Filter className="w-4 h-4" />
              </Button>
              <div className="flex items-center border rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <InventoryFilters
              filterStatus={filterStatus}
              filterCategory={filterCategory}
              sortBy={sortBy}
              categories={categoryOptions}
              filteredCount={filteredItems.length}
              onFilterStatusChange={setFilterStatus}
              onFilterCategoryChange={setFilterCategory}
              onSortByChange={setSortBy}
              onClearFilters={() => {
                setFilterStatus("all");
                setFilterCategory("All");
                setSortBy("name");
              }}
            />
          )}
        </AnimatePresence>

        {/* Stats */}
        <InventoryStats {...statsData} />

        {/* Items Grid/List */}
        <AnimatePresence mode="wait">
          {viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
            >
              {filteredItems.map((item, index) => (
                <InventoryGridItem
                  key={item.id}
                  item={item}
                  index={index}
                  userRole={userRole}
                  onEdit={handleEditItem}
                  onDelete={setDeleteTarget}
                  onConfirmReceipt={handleConfirmReceipt}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-card rounded-2xl border card-elevated overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        {t("Item")}
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        {t("Status")}
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        {t("Category")}
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                        {t("Qty")}
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                        {t("Sold")}
                      </th>
                      {userRole === "owner" && (
                        <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                          {t("Cost")}
                        </th>
                      )}
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                        {t("Price")}
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                        {t("Actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <InventoryListItem
                        key={item.id}
                        item={item}
                        userRole={userRole}
                        onEdit={handleEditItem}
                        onDelete={setDeleteTarget}
                        onConfirmReceipt={handleConfirmReceipt}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Item Dialog */}
      <InventoryFormDialog
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        title={t("Add New Item")}
        item={newItem}
        onItemChange={setNewItem}
        onSave={handleAddItem}
        onCancel={() => {
          setIsAddOpen(false);
          setNewItem(emptyNewItem);
        }}
        saveDisabled={
          !newItem.name.trim() ||
          !!getNameError(newItem.name) ||
          !!getPriceError(newItem.wholesalePrice, newItem.sellingPrice) ||
          !!getReorderError(newItem.reorderPoint) ||
          !!getBarcodeError(newItem.barcode)
        }
        validation={{
          nameError: getNameError(newItem.name),
          priceError: getPriceError(
            newItem.wholesalePrice,
            newItem.sellingPrice,
          ),
          reorderError: getReorderError(newItem.reorderPoint),
          barcodeError: getBarcodeError(newItem.barcode),
        }}
      />

      {/* Edit Item Dialog */}
      {editingItem && (
        <InventoryFormDialog
          isOpen={editingId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingId(null);
              setEditingItem(null);
            }
          }}
          title={t("Edit Item")}
          item={editingItem}
          onItemChange={(item) => setEditingItem(item)}
          onSave={handleSaveEdit}
          onCancel={() => {
            setEditingId(null);
            setEditingItem(null);
          }}
          saveDisabled={
            !editingItem?.name?.trim() ||
            !!getNameError(editingItem.name, editingId ?? undefined) ||
            !!getPriceError(
              editingItem.wholesalePrice,
              editingItem.sellingPrice,
            ) ||
            !!getReorderError(editingItem.reorderPoint) ||
            !!getBarcodeError(editingItem.barcode, editingId ?? undefined)
          }
          validation={{
            nameError: getNameError(editingItem.name, editingId ?? undefined),
            priceError: getPriceError(
              editingItem.wholesalePrice,
              editingItem.sellingPrice,
            ),
            reorderError: getReorderError(editingItem.reorderPoint),
            barcodeError: getBarcodeError(
              editingItem.barcode,
              editingId ?? undefined,
            ),
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete item")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "This action cannot be undone. You are about to delete {item} from inventory.",
                {
                  values: { item: deleteTarget?.name || t("this item") },
                },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
