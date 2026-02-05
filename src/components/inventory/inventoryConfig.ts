import { InventoryItem } from "@/types/inventoryTypes";
import {
  Package,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export const statusConfig: Record<
  InventoryItem["status"],
  { label: string; className: string; icon: any }
> = {
  "in-stock": {
    label: "In Stock",
    className: "bg-success/10 text-success border-success/20",
    icon: Package,
  },
  "low-stock": {
    label: "Low Stock",
    className: "bg-warning/10 text-warning border-warning/20",
    icon: AlertTriangle,
  },
  "out-of-stock": {
    label: "Out of Stock",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: AlertTriangle,
  },
};

export const emptyNewItem: Omit<InventoryItem, "id"> = {
  name: "",
  category: ["Accessories"],
  image: "",
  wholesalePrice: 0,
  sellingPrice: 0,
  quantity: 0,
  sold: 0,
  status: "in-stock",
  confirmedByApprentice: true,
  reorderPoint: 0,
  barcode: "",
  bundleQuantity: undefined,
  bundlePrice: undefined,
};

export const sortOptions = [
  { value: "name", label: "Name (A-Z)" },
  { value: "price-asc", label: "Price (Low to High)" },
  { value: "price-desc", label: "Price (High to Low)" },
  { value: "quantity-desc", label: "Quantity (High to Low)" },
  { value: "quantity-asc", label: "Quantity (Low to High)" },
  { value: "sold-desc", label: "Most Sold" },
];

export const generateSalesTrend = (sold: number) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, index) => ({
    day,
    sales: Math.floor(Math.random() * (sold / 3)) + Math.floor(sold / 7),
  }));
};
