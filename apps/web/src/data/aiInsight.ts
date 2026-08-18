import { Insight } from "@/types/aiInsightTypes";

export const insights: Insight[] = [
  {
    id: "1",
    type: "restock",
    priority: "high",
    title: "Urgent: Restock iPhone Chargers",
    description:
      "Based on current sales velocity of 8 units/day, you'll run out of USB-C Fast Chargers in approximately 2 days. Historical data shows stockouts result in 15% customer loss.",
    impact: "Potential revenue loss: ₦96,000/day",
    action: "Order 50 units now",
    metrics: [
      { label: "Current Stock", value: "16 units" },
      { label: "Daily Sales Avg", value: "8 units", trend: "up" },
      { label: "Days Until Stockout", value: "2 days" },
    ],
  },
  {
    id: "2",
    type: "trending",
    priority: "high",
    title: "Wireless Earbuds are Trending!",
    description:
      "Sales of Wireless Earbuds Pro have increased by 45% this week compared to last week. This product is outperforming all other accessories.",
    impact: "Additional profit opportunity: ₦125,000/week",
    action: "Increase stock by 50%",
    metrics: [
      { label: "This Week", value: "89 sold", trend: "up" },
      { label: "Last Week", value: "61 sold" },
      { label: "Growth", value: "+45%", trend: "up" },
    ],
  },
  {
    id: "3",
    type: "warning",
    priority: "medium",
    title: "Slow Moving: Laptop Sleeves",
    description:
      'Laptop Sleeve 15" has only sold 2 units in the last 30 days. Current inventory of 22 units will take approximately 11 months to sell at this rate.',
    impact: "Capital locked: ₦154,000",
    action: "Consider 20% discount",
    metrics: [
      { label: "Monthly Sales", value: "2 units", trend: "down" },
      { label: "Stock Value", value: "₦154,000" },
      { label: "Days to Clear", value: "330 days" },
    ],
  },
  {
    id: "4",
    type: "pricing",
    priority: "medium",
    title: "Price Optimization Opportunity",
    description:
      "Samsung Galaxy A54 is selling faster than average. Market analysis suggests you can increase the price by ₦5,000 without affecting demand.",
    impact: "Additional profit: ₦60,000/month",
    action: "Update pricing",
    metrics: [
      { label: "Current Price", value: "₦185,000" },
      { label: "Suggested Price", value: "₦190,000" },
      { label: "Profit Increase", value: "+₦5,000/unit" },
    ],
  },
  {
    id: "5",
    type: "opportunity",
    priority: "low",
    title: "New Product Suggestion",
    description:
      "Based on customer purchase patterns, customers buying phones often look for screen protectors. Consider adding tempered glass protectors to your inventory.",
    impact: "Estimated additional revenue: ₦45,000/week",
    action: "Add to inventory",
    metrics: [
      { label: "Related Purchases", value: "67%" },
      { label: "Avg Margin", value: "55%" },
      { label: "Est. Weekly Sales", value: "30 units" },
    ],
  },
  {
    id: "6",
    type: "opportunity",
    priority: "high",
    title: "Cross-Sell Opportunity: Phone + Case Bundle",
    description:
      "Customers who buy smartphones have an 89% probability of needing phone cases. By bundling cases with phones at a slight discount, you can increase attachment rate and revenue per transaction.",
    impact: "Additional revenue: ₦78,000/week",
    action: "Create bundle offer",
    metrics: [
      { label: "Customers buying phones", value: "156/week" },
      { label: "Currently buying cases", value: "64 (41%)" },
      { label: "Potential additional sales", value: "92 units" },
    ],
  },
  {
    id: "7",
    type: "opportunity",
    priority: "medium",
    title: "Upsell: Premium Wireless Earbuds",
    description:
      "Customers purchasing mid-range phones (₦80K-₦150K) frequently ask about audio accessories. Recommending Wireless Earbuds Pro could boost average order value by 12%.",
    impact: "Additional revenue: ₦45,600/week",
    action: "Train staff on upselling",
    metrics: [
      { label: "Mid-range phone buyers/week", value: "120" },
      { label: "Avg earbuds margin", value: "42%" },
      { label: "Conversion potential", value: "38 units/week" },
    ],
  },
  {
    id: "8",
    type: "pricing",
    priority: "medium",
    title: "Sales Optimization: End-of-Day Strategy",
    description:
      "Analysis shows customers have highest purchase intent between 4-6 PM. Implementing flash discounts (5-8%) during this window could increase daily transaction volume by 16% without affecting profit margins significantly.",
    impact: "Additional daily transactions: +8-10",
    action: "Schedule daily flash sales",
    metrics: [
      { label: "Peak hours", value: "4-6 PM" },
      { label: "Customer visit surge", value: "+23%" },
      { label: "Avg order value improvement", value: "+12%" },
    ],
  },
];