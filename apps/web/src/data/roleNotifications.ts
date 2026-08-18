import { Notification } from "@/types/notificationTypes";

// Owner notifications
export const ownerNotifications: Notification[] = [
  {
    id: "own-1",
    type: "inventory",
    title: "Low Stock Warning",
    message:
      "iPhone 15 Pro Max Case has only 2 units left. Reorder to maintain stock levels.",
    time: "30 mins ago",
    read: false,
    actionable: true,
  },
  {
    id: "own-2",
    type: "sale",
    title: "Large Sale Recorded",
    message:
      "Ibrahim sold Samsung Galaxy A54 for ₦185,000. Transaction completed successfully.",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "own-3",
    type: "ai",
    title: "Price Optimization",
    message:
      "Wireless Earbuds Pro are trending. Consider a slight price increase to maximize profits.",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "own-4",
    type: "alert",
    title: "Withdrawal Request",
    message:
      "Karim Okafor requested ₦43,200 withdrawal for December profits. Awaiting your approval.",
    time: "3 hours ago",
    read: true,
    actionable: true,
  },
  {
    id: "own-5",
    type: "sale",
    title: "Daily Sales Summary",
    message:
      "Total sales for today: ₦892,400 with 47 items sold. Profit margin: 24.8%.",
    time: "5 hours ago",
    read: true,
  },
];

// Apprentice notifications
export const apprenticeNotifications: Notification[] = [
  {
    id: "app-1",
    type: "inventory",
    title: "New Items Added by Owner",
    message:
      "Ahmed added 20 units of iPhone 15 Pro Max Cases to inventory. Please confirm receipt and update shelf location.",
    time: "5 mins ago",
    read: false,
    actionable: true,
  },
  {
    id: "app-2",
    type: "inventory",
    title: "Product Addition Request",
    message:
      "Ahmed wants to add 'Samsung Fast Wireless Charger' (15 units) to inventory. Review and accept to add to your sales list.",
    time: "15 mins ago",
    read: false,
    actionable: true,
  },
  {
    id: "app-3",
    type: "alert",
    title: "Stock Discrepancy Detected",
    message:
      "Expected 12 Wireless Mouse units but system shows 8. Please verify physical count and update.",
    time: "32 mins ago",
    read: false,
    actionable: true,
  },
  {
    id: "app-4",
    type: "sale",
    title: "Sale Confirmation Required",
    message:
      "Your sale of MacBook Pro Case (₦8,500) is pending owner approval. Transaction ID: TXN-4521.",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "app-5",
    type: "ai",
    title: "Restock Recommendation",
    message:
      "USB-C Fast Chargers you're selling are running low. Notify owner to restock within 48 hours.",
    time: "2 hours ago",
    read: true,
  },
  {
    id: "app-6",
    type: "inventory",
    title: "Price Update",
    message:
      "Owner updated the price of 'Wireless Earbuds Pro' from ₦12,000 to ₦13,500. Please use new pricing.",
    time: "3 hours ago",
    read: true,
  },
  {
    id: "app-7",
    type: "sale",
    title: "Sales Target Alert",
    message:
      "You've achieved 82% of this week's sales target (₦658,000/₦800,000). Great job!",
    time: "6 hours ago",
    read: true,
  },
];

// Investor notifications
export const investorNotifications: Notification[] = [
  {
    id: "inv-1",
    type: "ai",
    title: "Exceptional Profit Growth!",
    message:
      "Your January profit share is ₦112,000 - a 100% increase from October! The business is performing excellently.",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "inv-2",
    type: "sale",
    title: "Monthly Financial Report Available",
    message:
      "January 2026 financials are ready. Net profit: ₦560,000. Your share: ₦112,000 (20% ownership).",
    time: "2 hours ago",
    read: false,
    actionable: true,
  },
  {
    id: "inv-3",
    type: "alert",
    title: "Withdrawal Request Approved",
    message:
      "Your withdrawal request for ₦72,000 (November profits) has been approved and processed.",
    time: "1 day ago",
    read: false,
  },
  {
    id: "inv-4",
    type: "ai",
    title: "ROI Milestone Reached",
    message:
      "Congratulations! You've achieved 67.4% ROI in just 4 months. You're on track for 134% annual returns.",
    time: "2 days ago",
    read: true,
  },
  {
    id: "inv-5",
    type: "sale",
    title: "Revenue Growth Update",
    message:
      "Business revenue reached ₦2.1M this month (+75% since October). Your investment is scaling well.",
    time: "3 days ago",
    read: true,
  },
  {
    id: "inv-6",
    type: "inventory",
    title: "Business Expansion Notice",
    message:
      "Owner is expanding product line with new smartphone accessories. This may increase future profits.",
    time: "5 days ago",
    read: true,
  },
  {
    id: "inv-7",
    type: "ai",
    title: "Reinvestment Opportunity",
    message:
      "Consider reinvesting 30% of your profits to compound returns. Could increase annual ROI to 175%.",
    time: "1 week ago",
    read: true,
    actionable: true,
  },
];

// Helper function to get notifications by role
export const getNotificationsByRole = (role: "owner" | "apprentice" | "investor") => {
  switch (role) {
    case "owner":
      return ownerNotifications;
    case "apprentice":
      return apprenticeNotifications;
    case "investor":
      return investorNotifications;
    default:
      return ownerNotifications;
  }
};
