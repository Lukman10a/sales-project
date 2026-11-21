import { Injectable } from '@nestjs/common';
import type { CurrentUserPayload } from '../common';
import { holds } from '../common/constants/access-policy';
import { ExpensesService } from '../expenses/expenses.service';
import { ReportCache } from './report-cache';
import { ReportingRepository } from './reporting.repository';
import {
  percentChange,
  previousRange,
  resolvePeriod,
  type DayRange,
  type ReportPeriod,
} from './periods';
import type {
  PaymentMethodsQuery,
  PnlQuery,
  RevenueSeriesQuery,
  TopProductsQuery,
} from './dto/reporting.dto';

type Viewer = Pick<
  CurrentUserPayload,
  'businessId' | 'role' | 'permissions' | 'maxDiscountPercent'
>;

export interface Metric {
  value: number;
  /** The comparison period's value; null when there is none. */
  previous: number | null;
  /** Percent change from `previous`; null when there was nothing before. */
  change: number | null;
}

/** Fields only `reports.view_profit` may see, anywhere in a response. */
export const PROFIT_FIELDS = new Set([
  'profit',
  'cogs',
  'grossProfit',
  'netProfit',
  'expenses',
]);

/** Removes profit and cost fields, recursively. */
export function withoutProfit<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutProfit) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !PROFIT_FIELDS.has(k))
        .map(([k, v]) => [k, withoutProfit(v)]),
    ) as T;
  }
  return value;
}

const metric = (value: number, previous: number | null): Metric => ({
  value,
  previous,
  change: previous === null ? null : percentChange(value, previous),
});

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReportingService {
  constructor(
    private readonly reports: ReportingRepository,
    private readonly expenses: ExpensesService,
    private readonly cache: ReportCache,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** Shows profit only to those allowed; everything else is the same data. */
  private shape<T>(user: Viewer, value: T): T {
    return holds(user, 'reports.view_profit') ? value : withoutProfit(value);
  }

  /** GET /dashboard/summary: the headline numbers with their comparisons. */
  async summary(user: Viewer, period: ReportPeriod) {
    const p = resolvePeriod(period, this.clock());
    const key = `summary:${period}:${p.from}:${p.cutoff?.slice(0, 5) ?? ''}`;
    const data = await this.cache.wrap(user.businessId, key, async () => {
      const [now, before, restock] = await Promise.all([
        // Today so far is all of today; only the comparison day is cut off.
        this.reports.totals(user.businessId, p),
        this.reports.totals(user.businessId, p.previous, p.cutoff),
        this.reports.restockCount(user.businessId),
      ]);
      return {
        period,
        from: p.from,
        to: p.to,
        previous: p.previous,
        sales: metric(now.sales, before.sales),
        profit: metric(
          round2(now.sales - now.cogs),
          round2(before.sales - before.cogs),
        ),
        itemsSold: metric(now.itemsSold, before.itemsSold),
        saleCount: metric(now.saleCount, before.saleCount),
        // Stock is a level, not a flow: there is no earlier value to compare.
        restockCount: metric(restock, null),
        // Staff who recorded a sale in the period.
        onShiftStaff: metric(now.staffCount, before.staffCount),
      };
    });
    return this.shape(user, data);
  }

  /** GET /reports/revenue-series: daily sales (and profit) for a range. */
  async revenueSeries(user: Viewer, q: RevenueSeriesQuery) {
    const current: DayRange = { from: q.from, to: q.to };
    const key = `series:${q.from}:${q.to}:${q.compare}`;
    const data = await this.cache.wrap(user.businessId, key, async () => {
      const toPoints = async (range: DayRange) =>
        (await this.reports.daily(user.businessId, range)).map((d) => ({
          date: d.date,
          sales: d.sales,
          profit: round2(d.sales - d.cogs),
        }));
      const previous = q.compare === 'previous' ? previousRange(current) : null;
      return {
        from: q.from,
        to: q.to,
        current: await toPoints(current),
        previous: previous
          ? { ...previous, points: await toPoints(previous) }
          : null,
      };
    });
    return this.shape(user, data);
  }

  /** GET /reports/top-products */
  async topProducts(user: Viewer, q: TopProductsQuery) {
    const p = resolvePeriod(q.period, this.clock());
    const key = `top:${q.period}:${p.from}:${q.by}:${q.limit}`;
    const data = await this.cache.wrap(user.businessId, key, async () => ({
      period: q.period,
      from: p.from,
      to: p.to,
      by: q.by,
      products: (
        await this.reports.topProducts(user.businessId, p, q.by, q.limit)
      ).map((r) => ({
        productId: r.productId,
        name: r.name,
        units: r.units,
        revenue: r.revenue,
        profit: round2(r.revenue - r.cogs),
      })),
    }));
    return this.shape(user, data);
  }

  /** GET /reports/payment-methods */
  async paymentMethods(user: Viewer, q: PaymentMethodsQuery) {
    const p = resolvePeriod(q.period, this.clock());
    const key = `payments:${q.period}:${p.from}`;
    const data = await this.cache.wrap(user.businessId, key, async () => {
      const methods = await this.reports.paymentMethods(user.businessId, p);
      const total = methods.reduce((sum, m) => sum + m.amount, 0);
      return {
        period: q.period,
        from: p.from,
        to: p.to,
        total: round2(total),
        methods: methods.map((m) => ({
          ...m,
          share: total ? Math.round((m.amount / total) * 1000) / 10 : 0,
        })),
      };
    });
    return this.shape(user, data);
  }

  /**
   * GET /reports/pnl: sales - cost of goods sold = gross profit;
   * gross profit - expenses = net profit. Needs reports.view_profit.
   */
  async pnl(user: Viewer, q: PnlQuery) {
    const key = `pnl:${q.from}:${q.to}`;
    return this.cache.wrap(user.businessId, key, async () => {
      const [t, spent] = await Promise.all([
        this.reports.totals(user.businessId, q),
        this.expenses.summary(user.businessId, {
          from: q.from,
          to: q.to,
          groupBy: 'month',
        }),
      ]);
      const grossProfit = round2(t.sales - t.cogs);
      return {
        from: q.from,
        to: q.to,
        sales: t.sales,
        cogs: t.cogs,
        grossProfit,
        expenses: {
          total: spent.total,
          byCategory: spent.byCategory,
        },
        netProfit: round2(grossProfit - spent.total),
      };
    });
  }
}
