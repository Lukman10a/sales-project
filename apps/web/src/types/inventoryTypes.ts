export interface InventoryItem {
  id: string;
  name: string;
  category: string[];
  image: string;
  wholesalePrice: number;
  sellingPrice: number;
  quantity: number;
  sold: number;
  status: "in-stock" | "low-stock" | "out-of-stock";
  confirmedByApprentice: boolean;
  sku?: string;
  barcode?: string;
  supplier?: string;
  reorderPoint?: number;
  lastRestocked?: string;
  bundleQuantity?: number;
  bundlePrice?: number;
  createdBy?: string;
  createdByName?: string;
}