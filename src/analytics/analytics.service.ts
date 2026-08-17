import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';
import type { AnalyticsPeriod, TimeSeriesRow } from './analytics.repository';
import type { AnalyticsQueryDto } from './dto/analytics-query.dto';

export function calculatePercentageChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

export interface PeriodBoundaries {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
}

export function getPeriodBoundaries(
  period: AnalyticsPeriod,
  now: Date,
): PeriodBoundaries {
  const start = startOfDay(now);

  let from: Date;
  let to: Date;
  let previousFrom: Date;
  let previousTo: Date;

  switch (period) {
    case 'today':
      from = new Date(start);
      to = endOfDay(start);
      previousFrom = addDays(start, -1);
      previousTo = endOfDay(addDays(start, -1));
      break;
    case 'week':
      from = addDays(start, -6);
      to = endOfDay(start);
      previousFrom = addDays(start, -13);
      previousTo = endOfDay(addDays(start, -7));
      break;
    case 'month':
      from = addDays(start, -29);
      to = endOfDay(start);
      previousFrom = addDays(start, -59);
      previousTo = endOfDay(addDays(start, -30));
      break;
  }

  return { from, to, previousFrom, previousTo };
}

export interface TimeBucket {
  label: string;
  from: Date;
  to: Date;
}

export interface BuiltBuckets {
  unit: 'hour' | 'day' | 'week';
  buckets: TimeBucket[];
}

export function buildBuckets(period: AnalyticsPeriod, now: Date): BuiltBuckets {
  const start = startOfDay(now);

  switch (period) {
    case 'today': {
      const buckets: TimeBucket[] = [];
      for (let hour = 0; hour < 24; hour += 1) {
        const from = new Date(start);
        from.setHours(hour, 0, 0, 0);
        const to = new Date(from);
        to.setHours(hour, 59, 59, 999);
        buckets.push({
          label: `${String(hour).padStart(2, '0')}:00`,
          from,
          to,
        });
      }
      return { unit: 'hour', buckets };
    }
    case 'week': {
      const buckets: TimeBucket[] = [];
      for (let i = 6; i >= 0; i -= 1) {
        const dayStart = addDays(start, -i);
        buckets.push({
          label: toISODate(dayStart),
          from: dayStart,
          to: endOfDay(dayStart),
        });
      }
      return { unit: 'day', buckets };
    }
    case 'month': {
      const monthStart = addDays(start, -29);
      const buckets: TimeBucket[] = [];
      for (let week = 0; week < 4; week += 1) {
        const from = addDays(monthStart, week * 7);
        const to = week === 3 ? endOfDay(start) : endOfDay(addDays(from, 6));
        buckets.push({ label: `Week ${week + 1}`, from, to });
      }
      return { unit: 'week', buckets };
    }
  }
}

export interface ChartBucket {
  label: string;
  from: Date;
  to: Date;
  revenue: number;
  orders: number;
}

export function fillBuckets(
  buckets: TimeBucket[],
  rows: TimeSeriesRow[],
): ChartBucket[] {
  return buckets.map((bucket) => {
    const match = rows.find(
      (row) => new Date(row.bucket).getTime() === bucket.from.getTime(),
    );
    return {
      label: bucket.label,
      from: bucket.from,
      to: bucket.to,
      revenue: match ? match.revenue : 0,
      orders: match ? match.orders : 0,
    };
  });
}

@Injectable()
export class AnalyticsService {
  constructor(private analyticsRepository: AnalyticsRepository) {}

  async dashboard(user: { businessId: string }) {
    const businessId = user.businessId;
    const now = new Date();
    const today = getPeriodBoundaries('today', now);

    const [summary, todaySummary, inventory, topProducts, recentSales] =
      await Promise.all([
        this.analyticsRepository.summary(businessId),
        this.analyticsRepository.summary(businessId, today.from, today.to),
        this.analyticsRepository.inventoryBreakdown(businessId),
        this.analyticsRepository.topProducts(
          businessId,
          undefined,
          undefined,
          5,
        ),
        this.analyticsRepository.recentSales(businessId, 5),
      ]);

    return {
      metrics: {
        totalRevenue: summary.revenue,
        totalOrders: summary.orders,
        netProfit: summary.netProfit,
        todayRevenue: todaySummary.revenue,
        todayOrders: todaySummary.orders,
        lowStockCount: inventory.byStatus['low-stock'],
        outOfStockCount: inventory.byStatus['out-of-stock'],
      },
      inventory: {
        totalProducts: inventory.totalProducts,
        byStatus: inventory.byStatus,
        lowStockItems: inventory.lowStockItems,
      },
      topProducts,
      recentSales,
    };
  }

  async summary(user: { businessId: string }, query: AnalyticsQueryDto) {
    const boundaries = getPeriodBoundaries(query.period, new Date());

    const [current, previous] = await Promise.all([
      this.analyticsRepository.summary(
        user.businessId,
        boundaries.from,
        boundaries.to,
      ),
      this.analyticsRepository.summary(
        user.businessId,
        boundaries.previousFrom,
        boundaries.previousTo,
      ),
    ]);

    return {
      period: query.period,
      current,
      previous,
      trends: {
        revenueChange: calculatePercentageChange(
          current.revenue,
          previous.revenue,
        ),
        ordersChange: calculatePercentageChange(
          current.orders,
          previous.orders,
        ),
        netProfitChange: calculatePercentageChange(
          current.netProfit,
          previous.netProfit,
        ),
      },
    };
  }

  async salesChart(user: { businessId: string }, query: AnalyticsQueryDto) {
    const now = new Date();
    const { unit, buckets } = buildBuckets(query.period, now);
    const boundaries = getPeriodBoundaries(query.period, now);

    const rows = await this.analyticsRepository.timeSeries(
      user.businessId,
      boundaries.from,
      boundaries.to,
      unit,
    );

    return {
      period: query.period,
      unit,
      buckets: fillBuckets(buckets, rows),
    };
  }

  async categoryBreakdown(
    user: { businessId: string },
    query: AnalyticsQueryDto,
  ) {
    const boundaries = getPeriodBoundaries(query.period, new Date());

    const data = await this.analyticsRepository.categoryBreakdown(
      user.businessId,
      boundaries.from,
      boundaries.to,
    );

    return { period: query.period, data };
  }

  async topProducts(user: { businessId: string }, query: AnalyticsQueryDto) {
    const boundaries = getPeriodBoundaries(query.period, new Date());

    const data = await this.analyticsRepository.topProducts(
      user.businessId,
      boundaries.from,
      boundaries.to,
    );

    return { period: query.period, data };
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

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
