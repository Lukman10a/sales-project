export type InsightType =
  'restock' | 'trending' | 'warning' | 'pricing' | 'opportunity';

export type InsightPriority = 'high' | 'medium' | 'low';

export interface InsightMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down';
}

export interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  impact: string;
  action: string;
  metrics: InsightMetric[];
}

// Internal facts consumed by the pure engine
export interface InventoryFact {
  productId: string;
  name: string;
  quantity: number;
  reorderPoint?: number;
  wholesalePrice: number;
  sellingPrice: number;
  category: string[];
}

export interface SalesVelocityFact {
  productId: string;
  unitsSold30d: number;
  unitsSoldPrev30d: number;
}

export interface CoPurchasePair {
  productIdA: string;
  productIdB: string;
  nameA: string;
  nameB: string;
  count: number;
}

export interface InsightEngineInput {
  inventory: InventoryFact[];
  velocities: SalesVelocityFact[];
  coPurchasePairs: CoPurchasePair[];
}

export const INSIGHT_PRIORITY_ORDER: Record<InsightPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function selectTopAiInsight(insights: Insight[]): Insight | null {
  const highMedium = [...insights]
    .filter((i) => i.priority === 'high' || i.priority === 'medium')
    .sort(
      (a, b) =>
        INSIGHT_PRIORITY_ORDER[b.priority] - INSIGHT_PRIORITY_ORDER[a.priority],
    );
  return highMedium[0] ?? null;
}
