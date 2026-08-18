import { Insight } from "@/types/aiInsightTypes";

export const investorInsights: Insight[] = [
  {
    id: "inv-ai-1",
    type: "trending",
    priority: "high",
    title: "Outstanding Profit Growth This Quarter",
    description:
      "Your investment is performing exceptionally well! The business has shown a consistent 28% month-over-month profit growth. Your share of profits has increased from ₦56,000 in October to ₦112,000 in January.",
    impact: "ROI increase: +100% in 3 months",
    action: "Consider reinvesting profits",
    metrics: [
      { label: "Oct Profit", value: "₦56,000" },
      { label: "Jan Profit", value: "₦112,000", trend: "up" },
      { label: "Growth Rate", value: "+100%", trend: "up" },
    ],
  },
  {
    id: "inv-ai-2",
    type: "opportunity",
    priority: "high",
    title: "Strong ROI Performance",
    description:
      "Based on the current profit trajectory, you're on track to achieve a 134% annual ROI. The business net profit margin has improved from 23% to 27% over the past 4 months, indicating excellent operational efficiency.",
    impact: "Projected annual return: ₦670,000 on ₦500,000 investment",
    action: "Review for additional investment",
    metrics: [
      { label: "Current ROI", value: "67.4%", trend: "up" },
      { label: "Net Margin", value: "27%", trend: "up" },
      { label: "Total Profit (4mo)", value: "₦337,000" },
    ],
  },
  {
    id: "inv-ai-3",
    type: "trending",
    priority: "medium",
    title: "Revenue Growth Accelerating",
    description:
      "Business revenue has grown from ₦1.2M to ₦2.1M (+75%) in just 4 months. The acceleration in revenue growth from October to January indicates strong market demand and effective business strategy.",
    impact: "Your ownership benefits from scaling revenue",
    action: "Monitor for expansion opportunities",
    metrics: [
      { label: "Oct Revenue", value: "₦1.2M" },
      { label: "Jan Revenue", value: "₦2.1M", trend: "up" },
      { label: "Growth", value: "+75%", trend: "up" },
    ],
  },
  {
    id: "inv-ai-4",
    type: "pricing",
    priority: "medium",
    title: "Break-Even Point Achieved",
    description:
      "Excellent news! You've already recovered 67.4% of your initial ₦500,000 investment through profit distributions. At the current rate, you'll reach full break-even in approximately 2 months.",
    impact: "Complete capital recovery by March 2026",
    action: "Plan for profit-taking strategy",
    metrics: [
      { label: "Investment", value: "₦500,000" },
      { label: "Total Returns", value: "₦337,000" },
      { label: "Remaining", value: "₦163,000" },
    ],
  },
  {
    id: "inv-ai-5",
    type: "warning",
    priority: "low",
    title: "Operating Expenses Increasing",
    description:
      "While profits are growing, operating expenses have increased 40% from ₦200,000 to ₦280,000. This is typical for scaling businesses, but worth monitoring to ensure it doesn't erode profit margins.",
    impact: "Expense ratio: 13.3% of revenue (healthy range)",
    action: "Request expense breakdown from owner",
    metrics: [
      { label: "Oct Expenses", value: "₦200,000" },
      { label: "Jan Expenses", value: "₦280,000" },
      { label: "% of Revenue", value: "13.3%" },
    ],
  },
  {
    id: "inv-ai-6",
    type: "opportunity",
    priority: "low",
    title: "Withdrawal Pattern Analysis",
    description:
      "You've been withdrawing 100% of your monthly profits. Consider leaving 20-30% to compound within the business for accelerated growth, which could increase your future returns significantly.",
    impact: "Potential: +25% returns through reinvestment",
    action: "Discuss reinvestment strategy",
    metrics: [
      { label: "Withdrawn", value: "₦337,000" },
      { label: "Reinvested", value: "₦0" },
      { label: "Suggested Mix", value: "70/30" },
    ],
  },
];
