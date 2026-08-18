import { SaleItem, SaleRecord } from "@/types/salesTypes";

export const availableItems: SaleItem[] = [
  {
    id: "1",
    name: "Samsung Galaxy A54",
    image:
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200&h=200&fit=crop",
    sellingPrice: 185000,
    availableQty: 8,
  },
  {
    id: "2",
    name: "iPhone 15 Pro Max Case",
    image:
      "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=200&h=200&fit=crop",
    sellingPrice: 4500,
    availableQty: 2,
  },
  {
    id: "3",
    name: "Wireless Earbuds Pro",
    image:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop",
    sellingPrice: 25000,
    availableQty: 15,
  },
  {
    id: "4",
    name: 'Laptop Sleeve 15"',
    image:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200&h=200&fit=crop",
    sellingPrice: 12000,
    availableQty: 22,
  },
  {
    id: "5",
    name: "Wireless Mouse",
    image:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200&h=200&fit=crop",
    sellingPrice: 7500,
    availableQty: 5,
  },
];

export const recentSalesData: SaleRecord[] = [
  {
    id: "1",
    items: [{ name: "Samsung Galaxy A54", quantity: 1, price: 185000 }],
    total: 185000,
    soldBy: "Ibrahim",
    time: "2 mins ago",
    status: "completed",
  },
  {
    id: "2",
    items: [
      { name: "iPhone Charger Cable", quantity: 3, price: 4500 },
      { name: "Screen Protector", quantity: 2, price: 3000 },
    ],
    total: 7500,
    soldBy: "Ibrahim",
    time: "15 mins ago",
    status: "completed",
  },
  {
    id: "3",
    items: [{ name: "Wireless Earbuds Pro", quantity: 2, price: 50000 }],
    total: 50000,
    soldBy: "Ibrahim",
    time: "32 mins ago",
    status: "pending",
  },
];
