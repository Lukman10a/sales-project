"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import InventoryFilters from "@/components/inventory/InventoryFilters";
import InventoryFormDialog from "@/components/inventory/InventoryFormDialog";
import InventoryGridItem from "@/components/inventory/InventoryGridItem";
import InventoryListItem from "@/components/inventory/InventoryListItem";
import InventoryStats from "@/components/inventory/InventoryStats";
import { emptyNewItem } from "@/components/inventory/inventoryConfig";

export default function Inventory() {
  const { user } = useAuth();
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    confirmInventoryReceipt,
  } = useData();
  const userRole = user?.role || "owner";
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("name");
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

  const filteredItems = useMemo(() => {
    let items = inventory.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (filterStatus !== "all")
      items = items.filter((item) => item.status === filterStatus);
    if (filterCategory !== "All")
      items = items.filter((item) => item.category === filterCategory);

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
  }, [inventory, searchQuery, filterStatus, filterCategory, sortBy]);

  const handleAddItem = () => {
    const trimmedName = newItem.name.trim();
    if (!trimmedName) {
      toast(t("Please enter an item name"));
      return;
    }

    const itemToAdd: InventoryItem = {
      ...newItem,
      id: `${Date.now()}`,
      name: trimmedName,
      image:
        newItem.image.trim() ||
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
    };

    addInventoryItem(itemToAdd);
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
    });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingItem) return;
    const trimmedName = editingItem.name.trim();
    if (!trimmedName) {
      toast(t("Please enter an item name"));
      return;
    }
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

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <InventoryFilters
              filterStatus={filterStatus}
              filterCategory={filterCategory}
              sortBy={sortBy}
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
        saveDisabled={!newItem.name.trim()}
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
          saveDisabled={!editingItem?.name?.trim()}
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
