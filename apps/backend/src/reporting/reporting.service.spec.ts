import type { ExpensesService } from '../expenses/expenses.service';
import { ReportCache } from './report-cache';
import type { PeriodTotals, ReportingRepository } from './reporting.repository';
import { ReportingService, withoutProfit } from './reporting.service';

const owner = {
  businessId: 'b1',
  role: 'owner' as const,
  permissions: [],
  maxDiscountPercent: 100,
};
const cashier = {
  businessId: 'b1',
  role: 'cashier' as const,
  permissions: ['sales.record' as const],
  maxDiscountPercent: 0,
};

const totals = (over: Partial<PeriodTotals> = {}): PeriodTotals => ({
  sales: 0,
  cogs: 0,
  itemsSold: 0,
  saleCount: 0,
  staffCount: 0,
  ...over,
});

/** Every key anywhere in a value. */
function keysOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => [k, ...keysOf(v)]);
  }
  return [];
}

describe('ReportingService', () => {
  let repo: Record<string, jest.Mock>;
  let expenses: { summary: jest.Mock };
  let cache: ReportCache;
  let service: ReportingService;
  // Friday 20 Nov 2026, 10:15 in Lagos.
  const now = new Date('2026-11-20T09:15:00Z');

  beforeEach(() => {
    repo = {
      totals: jest.fn(),
      daily: jest.fn(),
      topProducts: jest.fn(),
      paymentMethods: jest.fn(),
      restockCount: jest.fn().mockResolvedValue(3),
    };
    expenses = { summary: jest.fn() };
    cache = new ReportCache();
    service = new ReportingService(
      repo as unknown as ReportingRepository,
      expenses as unknown as ExpensesService,
      cache,
      () => now,
    );
  });

  describe('summary', () => {
    beforeEach(() => {
      repo.totals
        .mockResolvedValueOnce(
          totals({
            sales: 1500,
            cogs: 1000,
            itemsSold: 12,
            saleCount: 4,
            staffCount: 2,
          }),
        )
        .mockResolvedValueOnce(
          totals({
            sales: 1000,
            cogs: 800,
            itemsSold: 10,
            saleCount: 5,
            staffCount: 2,
          }),
        );
    });

    it('compares today so far with the same weekday last week, to the same time', async () => {
      const s = await service.summary(owner, 'today');

      expect(repo.totals).toHaveBeenNthCalledWith(
        1,
        'b1',
        expect.objectContaining({ from: '2026-11-20', to: '2026-11-20' }),
      );
      expect(repo.totals).toHaveBeenNthCalledWith(
        2,
        'b1',
        { from: '2026-11-13', to: '2026-11-13' },
        '10:15:00',
      );
      expect(s).toMatchObject({
        sales: { value: 1500, previous: 1000, change: 50 },
        profit: { value: 500, previous: 200, change: 150 },
        itemsSold: { value: 12, previous: 10, change: 20 },
        saleCount: { value: 4, previous: 5, change: -20 },
        restockCount: { value: 3, previous: null, change: null },
        onShiftStaff: { value: 2, previous: 2, change: 0 },
      });
    });

    it('never gives a cashier the profit', async () => {
      const s = await service.summary(cashier, 'today');

      expect(keysOf(s)).not.toContain('profit');
      expect(s).toMatchObject({ sales: { value: 1500 } });
    });

    it('serves a repeat from the cache until the figures change', async () => {
      await service.summary(owner, 'today');
      await service.summary(cashier, 'today');
      expect(repo.totals).toHaveBeenCalledTimes(2);

      await cache.invalidate('b1');
      repo.totals.mockResolvedValue(totals());
      await service.summary(owner, 'today');
      expect(repo.totals).toHaveBeenCalledTimes(4);
    });
  });

  it('builds a daily series with the previous range of the same length', async () => {
    repo.daily
      .mockResolvedValueOnce([{ date: '2026-11-19', sales: 100, cogs: 60 }])
      .mockResolvedValueOnce([{ date: '2026-11-18', sales: 80, cogs: 50 }]);

    const s = await service.revenueSeries(owner, {
      from: '2026-11-19',
      to: '2026-11-19',
      compare: 'previous',
    });

    expect(repo.daily).toHaveBeenNthCalledWith(2, 'b1', {
      from: '2026-11-18',
      to: '2026-11-18',
    });
    expect(s).toEqual({
      from: '2026-11-19',
      to: '2026-11-19',
      current: [{ date: '2026-11-19', sales: 100, profit: 40 }],
      previous: {
        from: '2026-11-18',
        to: '2026-11-18',
        points: [{ date: '2026-11-18', sales: 80, profit: 30 }],
      },
    });
    const forCashier = await service.revenueSeries(cashier, {
      from: '2026-11-19',
      to: '2026-11-19',
      compare: 'previous',
    });
    expect(keysOf(forCashier)).not.toContain('profit');
  });

  it('ranks products and hides their profit from a cashier', async () => {
    repo.topProducts.mockResolvedValue([
      { productId: 'p1', name: 'Rice', units: 5, revenue: 500, cogs: 300 },
    ]);

    const s = await service.topProducts(cashier, {
      period: '7d',
      by: 'units',
      limit: 5,
    });

    expect(repo.topProducts).toHaveBeenCalledWith(
      'b1',
      expect.objectContaining({ from: '2026-11-14', to: '2026-11-20' }),
      'units',
      5,
    );
    expect(s.products).toEqual([
      { productId: 'p1', name: 'Rice', units: 5, revenue: 500 },
    ]);
  });

  it('gives each payment method its share', async () => {
    repo.paymentMethods.mockResolvedValue([
      { method: 'cash', amount: 300, saleCount: 2 },
      { method: 'transfer', amount: 100, saleCount: 1 },
    ]);

    const s = await service.paymentMethods(owner, { period: 'month' });

    expect(s).toMatchObject({
      from: '2026-11-01',
      to: '2026-11-20',
      total: 400,
      methods: [
        { method: 'cash', share: 75 },
        { method: 'transfer', share: 25 },
      ],
    });
  });

  it('subtracts cost of goods sold and then expenses for the P&L', async () => {
    repo.totals.mockResolvedValue(totals({ sales: 10000.5, cogs: 6000.25 }));
    expenses.summary.mockResolvedValue({
      total: 2500,
      byCategory: [{ category: 'rent', amount: 2500 }],
      series: [],
    });

    await expect(
      service.pnl(owner, { from: '2026-11-01', to: '2026-11-30' }),
    ).resolves.toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
      sales: 10000.5,
      cogs: 6000.25,
      grossProfit: 4000.25,
      expenses: {
        total: 2500,
        byCategory: [{ category: 'rent', amount: 2500 }],
      },
      netProfit: 1500.25,
    });
    expect(expenses.summary).toHaveBeenCalledWith('b1', {
      from: '2026-11-01',
      to: '2026-11-30',
      groupBy: 'month',
    });
  });

  it('strips profit fields at any depth', () => {
    expect(
      withoutProfit({ a: 1, profit: 2, nested: [{ cogs: 1, units: 3 }] }),
    ).toEqual({ a: 1, nested: [{ units: 3 }] });
  });
});
