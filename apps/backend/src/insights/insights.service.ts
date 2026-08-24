import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InsightRepository } from './insight.repository';
import { generateInsights } from './insight.engine';
import type { Insight } from './insight.types';
import type { QueryInsightsDto } from './dto/query-insights.dto';
import type { InsightLlmProvider } from './ai/insight-llm.provider';
import { NoopInsightProvider } from './ai/insight-llm.provider';

@Injectable()
export class InsightsService {
  constructor(
    private readonly insightRepository: InsightRepository,
    @Optional()
    @Inject('INSIGHT_LLM_PROVIDER')
    private readonly llmProvider?: InsightLlmProvider,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  private getProvider(): InsightLlmProvider {
    return this.llmProvider ?? new NoopInsightProvider();
  }

  async list(
    user: { businessId: string },
    query: QueryInsightsDto,
  ): Promise<Insight[]> {
    const now = new Date();
    const from = addDays(startOfDay(now), -29);
    const to = endOfDay(now);
    const previousFrom = addDays(startOfDay(now), -59);
    const previousTo = endOfDay(addDays(startOfDay(now), -30));

    const [inventory, velocities, coPurchasePairs, narratives] =
      await Promise.all([
        this.insightRepository.inventoryFacts(user.businessId),
        this.insightRepository.salesVelocity(
          user.businessId,
          from,
          to,
          previousFrom,
          previousTo,
        ),
        this.insightRepository.coPurchasePairs(user.businessId, 20),
        this.insightRepository.findNarratives(user.businessId),
      ]);

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

    // merge persisted narratives
    insights = insights.map((i) => {
      const narrative = narratives.get(i.id);
      return narrative ? { ...i, description: narrative } : i;
    });

    if (query.type) insights = insights.filter((i) => i.type === query.type);
    if (query.priority)
      insights = insights.filter((i) => i.priority === query.priority);

    return insights.slice(0, query.limit);
  }

  async findOne(user: { businessId: string }, id: string): Promise<Insight> {
    const insights = await this.list(user, { limit: 50 });
    const found = insights.find((i) => i.id === id);
    if (!found) throw new NotFoundException('Insight not found');
    return found;
  }

  async generate(
    user: { businessId: string },
    query: QueryInsightsDto,
  ): Promise<Insight[]> {
    const insights = await this.list(user, query);
    if (insights.length === 0) return insights;
    let narratives: Map<string, string>;
    try {
      narratives = await this.getProvider().generateNarratives(insights);
    } catch {
      // fallback to template text on provider failure
      narratives = new Map(insights.map((i) => [i.id, i.description]));
    }
    // if provider returned empty or partial, fallback per-insight
    for (const i of insights) {
      if (!narratives.has(i.id)) narratives.set(i.id, i.description);
    }
    try {
      await this.insightRepository.saveNarratives(user.businessId, narratives);
    } catch {
      // persistence failure should not 500 the whole batch (graceful)
    }
    const refreshed = await this.list(user, query);
    // emit for ai notifications (top priority insight) with AI narrative
    try {
      this.eventEmitter?.emit('insights.generated', {
        businessId: user.businessId,
        insights: refreshed,
      });
    } catch {
      // event failure should not break generate
    }
    return refreshed;
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
