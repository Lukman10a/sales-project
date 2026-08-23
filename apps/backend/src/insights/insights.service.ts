import { Injectable, NotFoundException } from '@nestjs/common';
import { InsightRepository } from './insight.repository';
import { generateInsights } from './insight.engine';
import type { Insight } from './insight.types';
import type { QueryInsightsDto } from './dto/query-insights.dto';

@Injectable()
export class InsightsService {
  constructor(private readonly insightRepository: InsightRepository) {}

  async list(
    user: { businessId: string },
    query: QueryInsightsDto,
  ): Promise<Insight[]> {
    const now = new Date();
    const from = addDays(startOfDay(now), -29);
    const to = endOfDay(now);
    const previousFrom = addDays(startOfDay(now), -59);
    const previousTo = endOfDay(addDays(startOfDay(now), -30));

    const [inventory, velocities, coPurchasePairs] = await Promise.all([
      this.insightRepository.inventoryFacts(user.businessId),
      this.insightRepository.salesVelocity(
        user.businessId,
        from,
        to,
        previousFrom,
        previousTo,
      ),
      this.insightRepository.coPurchasePairs(user.businessId, 20),
    ]);

    // ensure every inventory product has a velocity entry (0 if missing)
    const velMap = new Map(velocities.map((v) => [v.productId, v]));
    const completeVelocities = inventory.map(
      (inv) =>
        velMap.get(inv.productId) ?? {
          productId: inv.productId,
          unitsSold30d: 0,
          unitsSoldPrev30d: 0,
        },
    );

    let insights = generateInsights(
      { inventory, velocities: completeVelocities, coPurchasePairs },
      query.limit,
    );

    if (query.type) insights = insights.filter((i) => i.type === query.type);
    if (query.priority)
      insights = insights.filter((i) => i.priority === query.priority);

    // re-cap after filtering (already sorted)
    return insights.slice(0, query.limit);
  }

  async findOne(user: { businessId: string }, id: string): Promise<Insight> {
    const insights = await this.list(user, { limit: 50 });
    const found = insights.find((i) => i.id === id);
    if (!found) throw new NotFoundException('Insight not found');
    return found;
  }
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
