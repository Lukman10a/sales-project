import type {
  Insight,
  InsightEngineInput,
  InsightPriority,
  SalesVelocityFact,
} from './insight.types';
import { INSIGHT_PRIORITY_ORDER } from './insight.types';

const MIN_TRENDING_VOLUME = 10;
const VELOCITY_WINDOW_DAYS = 30;
const RESTOCK_HIGH_DAYS = 3;
const RESTOCK_MEDIUM_DAYS = 7;
const SLOW_MOVER_UNITS_THRESHOLD = 2;
const SLOW_MOVER_CLEAR_DAYS = 60;
const PRICING_MARGIN_THRESHOLD = 0.3;
const PRICING_VELOCITY_MULTIPLIER = 1.5;
const MAX_INSIGHTS_DEFAULT = 10;

function daysToStockout(quantity: number, velocityPerDay: number): number {
  if (velocityPerDay <= 0) return Number.POSITIVE_INFINITY;
  return quantity / velocityPerDay;
}

function velocityPerDay(unitsSold30d: number): number {
  return unitsSold30d / VELOCITY_WINDOW_DAYS;
}

function growthPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function makeId(type: string, productId: string): string {
  return `${type}:${productId}`;
}

function sortInsights(insights: Insight[]): Insight[] {
  return insights.sort((a, b) => {
    const pri =
      INSIGHT_PRIORITY_ORDER[b.priority] - INSIGHT_PRIORITY_ORDER[a.priority];
    if (pri !== 0) return pri;
    // secondary: impact lexical proxy – longer impact considered higher (deterministic fallback to title)
    if (b.impact.length !== a.impact.length)
      return b.impact.length - a.impact.length;
    return a.title.localeCompare(b.title);
  });
}

export function generateInsights(
  input: InsightEngineInput,
  cap: number = MAX_INSIGHTS_DEFAULT,
): Insight[] {
  const velocityMap = new Map<string, SalesVelocityFact>();
  for (const v of input.velocities) velocityMap.set(v.productId, v);

  const nameMap = new Map<string, string>();
  for (const inv of input.inventory) nameMap.set(inv.productId, inv.name);

  const avgVelocity =
    input.velocities.length === 0
      ? 0
      : input.velocities.reduce(
          (sum, v) => sum + velocityPerDay(v.unitsSold30d),
          0,
        ) / input.velocities.length;

  const insights: Insight[] = [];
  const seen = new Set<string>();

  function push(insight: Insight) {
    if (seen.has(insight.id)) return;
    seen.add(insight.id);
    insights.push(insight);
  }

  for (const inv of input.inventory) {
    const v = velocityMap.get(inv.productId);
    const units30 = v?.unitsSold30d ?? 0;
    const prev30 = v?.unitsSoldPrev30d ?? 0;
    const vel = velocityPerDay(units30);
    const dts = daysToStockout(inv.quantity, vel);
    const margin =
      inv.sellingPrice > 0
        ? (inv.sellingPrice - inv.wholesalePrice) / inv.sellingPrice
        : 0;

    // restock
    {
      const reorder = inv.reorderPoint ?? 5;
      const shouldConsider =
        inv.quantity <= reorder ||
        (Number.isFinite(dts) && dts <= RESTOCK_MEDIUM_DAYS);
      if (shouldConsider && Number.isFinite(dts)) {
        let priority: InsightPriority | null = null;
        if (dts <= RESTOCK_HIGH_DAYS) priority = 'high';
        else if (dts <= RESTOCK_MEDIUM_DAYS) priority = 'medium';
        if (priority) {
          push({
            id: makeId('restock', inv.productId),
            type: 'restock',
            priority,
            title: `Restock ${inv.name}`,
            description: `${inv.name} will stock out in ${dts.toFixed(1)} days at current velocity.`,
            impact: `Risk of lost sales for ${inv.name}`,
            action: `Reorder ${inv.name} immediately`,
            metrics: [
              {
                label: 'Days to stockout',
                value: `${dts.toFixed(1)}d`,
                trend: 'down',
              },
              { label: 'Velocity', value: `${vel.toFixed(1)}/d`, trend: 'up' },
              { label: 'Quantity', value: String(inv.quantity) },
              { label: 'Reorder point', value: String(reorder) },
            ],
          });
        }
      }
    }

    // trending
    {
      const growth = growthPercent(units30, prev30);
      if (units30 >= MIN_TRENDING_VOLUME) {
        let priority: InsightPriority | null = null;
        if (growth >= 50) priority = 'high';
        else if (growth >= 25) priority = 'medium';
        if (priority) {
          push({
            id: makeId('trending', inv.productId),
            type: 'trending',
            priority,
            title: `${inv.name} trending up`,
            description: `${inv.name} sales up ${growth.toFixed(1)}% vs previous period.`,
            impact: `Growth opportunity for ${inv.name}`,
            action: `Promote ${inv.name} and ensure stock`,
            metrics: [
              { label: 'Growth', value: `${growth.toFixed(1)}%`, trend: 'up' },
              { label: 'Units (30d)', value: String(units30), trend: 'up' },
              { label: 'Previous (30d)', value: String(prev30) },
            ],
          });
        }
      }
    }

    // warning / slow-mover
    {
      const dtc = daysToStockout(inv.quantity, vel <= 0 ? 0.1 : vel);
      // low units + days to clear threshold
      if (
        units30 <= SLOW_MOVER_UNITS_THRESHOLD &&
        dtc > SLOW_MOVER_CLEAR_DAYS
      ) {
        push({
          id: makeId('warning', inv.productId),
          type: 'warning',
          priority: 'low',
          title: `Slow mover: ${inv.name}`,
          description: `${inv.name} sold only ${units30} units in 30 days with ${inv.quantity} in stock.`,
          impact: `Capital tied up in slow-moving ${inv.name}`,
          action: `Consider discount or bundle for ${inv.name}`,
          metrics: [
            { label: 'Units (30d)', value: String(units30), trend: 'down' },
            { label: 'Quantity', value: String(inv.quantity) },
            { label: 'Days to clear', value: `${dtc.toFixed(1)}d` },
          ],
        });
      }
    }

    // pricing
    {
      // guardrails: no near-stockout, no negative margin
      const nearStockout = Number.isFinite(dts) && dts <= RESTOCK_HIGH_DAYS;
      const hasHealthyMargin = margin >= PRICING_MARGIN_THRESHOLD;
      const aboveAvgVelocity =
        avgVelocity > 0 && vel > avgVelocity * PRICING_VELOCITY_MULTIPLIER;

      if (
        !nearStockout &&
        hasHealthyMargin &&
        aboveAvgVelocity &&
        margin >= 0
      ) {
        push({
          id: makeId('pricing', inv.productId),
          type: 'pricing',
          priority: 'medium',
          title: `Pricing opportunity: ${inv.name}`,
          description: `${inv.name} has above-average velocity with ${(margin * 100).toFixed(1)}% margin.`,
          impact: `Margin upside on ${inv.name}`,
          action: `Consider raising price of ${inv.name} by 5-10%`,
          metrics: [
            {
              label: 'Margin',
              value: `${(margin * 100).toFixed(1)}%`,
              trend: 'up',
            },
            { label: 'Velocity', value: `${vel.toFixed(1)}/d`, trend: 'up' },
            { label: 'Avg velocity', value: `${avgVelocity.toFixed(1)}/d` },
          ],
        });
      }
    }
  }

  // opportunity: co-purchase
  for (const pair of input.coPurchasePairs) {
    // skip if either product is near stockout (guardrail at pair level)
    const aVel = velocityPerDay(
      velocityMap.get(pair.productIdA)?.unitsSold30d ?? 0,
    );
    const bVel = velocityPerDay(
      velocityMap.get(pair.productIdB)?.unitsSold30d ?? 0,
    );
    const aQty =
      input.inventory.find((i) => i.productId === pair.productIdA)?.quantity ??
      0;
    const bQty =
      input.inventory.find((i) => i.productId === pair.productIdB)?.quantity ??
      0;
    const aStockout = daysToStockout(aQty, aVel);
    const bStockout = daysToStockout(bQty, bVel);
    if (
      (Number.isFinite(aStockout) && aStockout <= RESTOCK_HIGH_DAYS) ||
      (Number.isFinite(bStockout) && bStockout <= RESTOCK_HIGH_DAYS)
    ) {
      continue;
    }

    const id = `opportunity:${pair.productIdA}:${pair.productIdB}`;
    push({
      id,
      type: 'opportunity',
      priority: 'medium',
      title: `Bundle: ${pair.nameA} + ${pair.nameB}`,
      description: `${pair.nameA} and ${pair.nameB} are bought together ${pair.count} times.`,
      impact: `Bundle opportunity for ${pair.nameA} and ${pair.nameB}`,
      action: `Create a bundle for ${pair.nameA} + ${pair.nameB}`,
      metrics: [
        { label: 'Co-purchases', value: String(pair.count), trend: 'up' },
        { label: 'Pair', value: `${pair.nameA} + ${pair.nameB}` },
      ],
    });
  }

  const sorted = sortInsights(insights);
  return sorted.slice(0, cap);
}

export const __test__ = {
  MIN_TRENDING_VOLUME,
  RESTOCK_HIGH_DAYS,
  RESTOCK_MEDIUM_DAYS,
  SLOW_MOVER_UNITS_THRESHOLD,
  SLOW_MOVER_CLEAR_DAYS,
  PRICING_MARGIN_THRESHOLD,
  PRICING_VELOCITY_MULTIPLIER,
  VELOCITY_WINDOW_DAYS,
};
