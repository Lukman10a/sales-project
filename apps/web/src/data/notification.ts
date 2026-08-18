import { Notification } from "@/types/notificationTypes";

export const notifications: Notification[] = [
  {
    id: "1",
    type: "inventory",
    title: "New Items Added",
    message:
      "Ahmed added 20 units of iPhone 15 Pro Max Cases to inventory. Please confirm receipt.",
    time: "5 mins ago",
    read: false,
    actionable: true,
    relatedItemId: "1",
    actionType: "confirm",
  },
  {
    id: "2",
    type: "alert",
    title: "Stock Discrepancy Detected",
    message:
      "Expected 12 Wireless Mouse units but system shows 8. Please verify physical count.",
    time: "15 mins ago",
    read: false,
    actionable: true,
    relatedItemId: "2",
    actionType: "reorder",
  },
  {
    id: "3",
    type: "sale",
    title: "Large Sale Recorded",
    message:
      "Ibrahim sold Samsung Galaxy A54 for ₦185,000. Transaction completed successfully.",
    time: "32 mins ago",
    read: false,
    actionable: true,
    relatedItemId: "3",
    actionType: "manage",
  },
  {
    id: "4",
    type: "ai",
    title: "Restock Recommendation",
    message:
      "USB-C Fast Chargers are selling fast. Consider restocking within 48 hours to avoid stockout.",
    time: "1 hour ago",
    read: true,
    actionable: true,
    relatedItemId: "4",
    actionType: "reorder",
  },
  {
    id: "5",
    type: "inventory",
    title: "Low Stock Warning",
    message:
      "iPhone 15 Pro Max Case has only 2 units left. Reorder to maintain stock levels.",
    time: "2 hours ago",
    read: true,
    actionable: true,
    relatedItemId: "1",
    actionType: "reorder",
  },
  {
    id: "6",
    type: "sale",
    title: "Daily Sales Summary",
    message:
      "Total sales for today: ₦892,400 with 47 items sold. Profit margin: 24.8%.",
    time: "3 hours ago",
    read: true,
  },
  {
    id: "7",
    type: "ai",
    title: "Price Optimization",
    message:
      "Wireless Earbuds Pro are trending. Consider a slight price increase to maximize profits.",
    time: "5 hours ago",
    read: true,
    actionable: true,
    actionType: "discount",
  },
];