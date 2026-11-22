export interface InventoryItem {
  id: string;
  name: string;
  category: string[];
  image: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  sold: number;
  status: "in-stock" | "low-stock" | "out-of-stock";
  sku?: string;
  barcode?: string;
  supplier?: string;
  reorderPoint?: number;
  lastRestocked?: string;
  cartonSize?: number;
  cartonPrice?: number;
  /** YYYY-MM-DD */
  expiryDate?: string;
  createdBy?: string;
  createdByName?: string;
}