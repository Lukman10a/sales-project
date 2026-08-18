export interface Insight {
  id: string;
  type: "restock" | "trending" | "warning" | "opportunity" | "pricing";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  action: string;
  metrics?: { label: string; value: string; trend?: "up" | "down" }[];
}