import {
  AnalyticsService,
  calculatePercentageChange,
  getPeriodBoundaries,
  buildBuckets,
  fillBuckets,
} from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import type {
  AnalyticsSummaryRow,
  TimeSeriesRow,
  InventoryBreakdown,
} from './analytics.repository';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repository: {
    summary: jest.Mock;
    timeSeries: jest.Mock;
    categoryBreakdown: jest.Mock;
    topProducts: jest.Mock;
    recentSales: jest.Mock;
    inventoryBreakdown: jest.Mock;
  };

  const user = { businessId: 'b1' };

  const summaryRow: AnalyticsSummaryRow = {
    revenue: 100,
    orders: 2,
    netProfit: 40,
  };

  beforeEach(() => {
    repository = {
      summary: jest.fn(),
      timeSeries: jest.fn(),
      categoryBreakdown: jest.fn(),
      topProducts: jest.fn(),
      recentSales: jest.fn(),
      inventoryBreakdown: jest.fn(),
    };
    service = new AnalyticsService(
      repository as unknown as AnalyticsRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculatePercentageChange', () => {
    it('returns 0 when both current and previous are zero', () => {
      expect(calculatePercentageChange(0, 0)).toBe(0);
    });

    it('returns 100 when previous is zero and current is positive', () => {
      expect(calculatePercentageChange(100, 0)).toBe(100);
    });

    it('returns 0 when previous is zero and current is zero', () => {
      expect(calculatePercentageChange(0, 0)).toBe(0);
    });

    it('computes a positive percentage change', () => {
      expect(calculatePercentageChange(120, 100)).toBe(20);
    });

    it('computes a negative percentage change', () => {
      expect(calculatePercentageChange(50, 100)).toBe(-50);
    });

    it('rounds to one decimal place', () => {
      expect(calculatePercentageChange(133.33, 100)).toBe(33.3);
    });
  });

  describe('getPeriodBoundaries', () => {
    const now = new Date(2024, 5, 15, 14, 30, 0);

    it('computes today vs yesterday boundaries', () => {
      const b = getPeriodBoundaries('today', now);
      expect(b.from.getTime()).toBe(new Date(2024, 5, 15, 0, 0, 0).getTime());
      expect(b.to.getTime()).toBe(
        new Date(2024, 5, 15, 23, 59, 59, 999).getTime(),
      );
      expect(b.previousFrom.getTime()).toBe(
        new Date(2024, 5, 14, 0, 0, 0).getTime(),
      );
      expect(b.previousTo.getTime()).toBe(
        new Date(2024, 5, 14, 23, 59, 59, 999).getTime(),
      );
    });

    it('computes last 7 days vs previous 7 days boundaries', () => {
      const b = getPeriodBoundaries('week', now);
      expect(b.from.getTime()).toBe(new Date(2024, 5, 9, 0, 0, 0).getTime());
      expect(b.to.getTime()).toBe(
        new Date(2024, 5, 15, 23, 59, 59, 999).getTime(),
      );
      expect(b.previousFrom.getTime()).toBe(
        new Date(2024, 5, 2, 0, 0, 0).getTime(),
      );
      expect(b.previousTo.getTime()).toBe(
        new Date(2024, 5, 8, 23, 59, 59, 999).getTime(),
      );
    });

    it('computes last 30 days vs previous 30 days boundaries', () => {
      const b = getPeriodBoundaries('month', now);
      expect(b.from.getTime()).toBe(new Date(2024, 4, 17, 0, 0, 0).getTime());
      expect(b.to.getTime()).toBe(
        new Date(2024, 5, 15, 23, 59, 59, 999).getTime(),
      );
      expect(b.previousFrom.getTime()).toBe(
        new Date(2024, 3, 17, 0, 0, 0).getTime(),
      );
      expect(b.previousTo.getTime()).toBe(
        new Date(2024, 4, 16, 23, 59, 59, 999).getTime(),
      );
    });
  });

  describe('buildBuckets', () => {
    const now = new Date(2024, 5, 15, 14, 30, 0);

    it('builds 24 hourly buckets for today', () => {
      const { unit, buckets } = buildBuckets('today', now);
      expect(unit).toBe('hour');
      expect(buckets).toHaveLength(24);
      expect(buckets[0].label).toBe('00:00');
      expect(buckets[23].label).toBe('23:00');
      expect(buckets[0].from.getTime()).toBe(
        new Date(2024, 5, 15, 0, 0, 0).getTime(),
      );
      expect(buckets[23].to.getTime()).toBe(
        new Date(2024, 5, 15, 23, 59, 59, 999).getTime(),
      );
    });

    it('builds 7 daily buckets for the week', () => {
      const { unit, buckets } = buildBuckets('week', now);
      expect(unit).toBe('day');
      expect(buckets).toHaveLength(7);
      expect(buckets[0].label).toBe('2024-06-09');
      expect(buckets[6].label).toBe('2024-06-15');
      expect(buckets[6].to.getTime()).toBe(
        new Date(2024, 5, 15, 23, 59, 59, 999).getTime(),
      );
    });

    it('builds 4 weekly buckets for the month', () => {
      const { unit, buckets } = buildBuckets('month', now);
      expect(unit).toBe('week');
      expect(buckets).toHaveLength(4);
      expect(buckets[0].label).toBe('Week 1');
      expect(buckets[3].label).toBe('Week 4');
      expect(buckets[3].to.getTime()).toBe(
        new Date(2024, 5, 15, 23, 59, 59, 999).getTime(),
      );
    });
  });

  describe('fillBuckets', () => {
    const now = new Date(2024, 5, 15, 14, 30, 0);
    const { buckets } = buildBuckets('week', now);
    const rows: TimeSeriesRow[] = [
      { bucket: new Date(2024, 5, 12, 0, 0, 0), revenue: 50, orders: 1 },
    ];

    it('maps matching rows into buckets and zero-fills the rest', () => {
      const filled = fillBuckets(buckets, rows);
      expect(filled).toHaveLength(7);
      expect(filled[3].revenue).toBe(50);
      expect(filled[3].orders).toBe(1);
      expect(filled[0].revenue).toBe(0);
      expect(filled[6].revenue).toBe(0);
    });
  });

  describe('dashboard', () => {
    it('assembles metrics, inventory breakdown, top products and recent sales', async () => {
      const inventory: InventoryBreakdown = {
        totalProducts: 4,
        byStatus: { 'in-stock': 2, 'low-stock': 1, 'out-of-stock': 1 },
        lowStockItems: [],
      };
      repository.summary.mockResolvedValue(summaryRow);
      repository.inventoryBreakdown.mockResolvedValue(inventory);
      repository.topProducts.mockResolvedValue([
        { productId: 'p1', name: 'A', units: 5, revenue: 100 },
      ]);
      repository.recentSales.mockResolvedValue([
        {
          id: 's1',
          total: 100,
          status: 'completed',
          saleDate: new Date(),
          customerName: 'C',
          paymentMethod: 'cash',
        },
      ]);

      const result = await service.dashboard(user);

      expect(repository.summary).toHaveBeenNthCalledWith(1, 'b1');
      expect(repository.summary).toHaveBeenNthCalledWith(
        2,
        'b1',
        expect.any(Date),
        expect.any(Date),
      );
      expect(result.metrics).toEqual({
        totalRevenue: 100,
        totalOrders: 2,
        netProfit: 40,
        todayRevenue: 100,
        todayOrders: 2,
        lowStockCount: 1,
        outOfStockCount: 1,
      });
      expect(result.inventory).toEqual({
        totalProducts: 4,
        byStatus: inventory.byStatus,
        lowStockItems: [],
      });
      expect(result.topProducts).toHaveLength(1);
      expect(result.recentSales).toHaveLength(1);
    });
  });

  describe('summary', () => {
    it('returns current vs previous with trend percentages', async () => {
      repository.summary.mockResolvedValueOnce(summaryRow);
      repository.summary.mockResolvedValueOnce({
        revenue: 50,
        orders: 1,
        netProfit: 20,
      });

      const result = await service.summary(user, { period: 'week' });

      expect(repository.summary).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        period: 'week',
        current: summaryRow,
        previous: { revenue: 50, orders: 1, netProfit: 20 },
        trends: {
          revenueChange: 100,
          ordersChange: 100,
          netProfitChange: 100,
        },
      });
    });

    it('returns zero-percent trends when previous period had no activity', async () => {
      repository.summary.mockResolvedValue(summaryRow);
      repository.summary.mockResolvedValueOnce(summaryRow);

      const result = await service.summary(user, { period: 'today' });
      expect(result.trends).toEqual({
        revenueChange: 0,
        ordersChange: 0,
        netProfitChange: 0,
      });
    });
  });

  describe('salesChart', () => {
    it('returns zero-filled buckets for the requested period', async () => {
      const rows: TimeSeriesRow[] = [
        { bucket: new Date(2024, 5, 15, 10, 0, 0), revenue: 30, orders: 1 },
      ];
      repository.timeSeries.mockResolvedValue(rows);

      jest.useFakeTimers();
      jest.setSystemTime(new Date(2024, 5, 15, 14, 30, 0));

      const result = await service.salesChart(user, { period: 'today' });

      jest.useRealTimers();

      expect(repository.timeSeries).toHaveBeenCalledWith(
        'b1',
        expect.any(Date),
        expect.any(Date),
        'hour',
      );
      expect(result.period).toBe('today');
      expect(result.unit).toBe('hour');
      expect(result.buckets).toHaveLength(24);
      expect(result.buckets[10].revenue).toBe(30);
      expect(result.buckets[0].revenue).toBe(0);
    });
  });

  describe('categoryBreakdown', () => {
    it('delegates to the repository with period boundaries', async () => {
      repository.categoryBreakdown.mockResolvedValue([
        { category: 'Drinks', revenue: 100, units: 10, orders: 2 },
      ]);

      const result = await service.categoryBreakdown(user, { period: 'month' });

      expect(repository.categoryBreakdown).toHaveBeenCalledWith(
        'b1',
        expect.any(Date),
        expect.any(Date),
      );
      expect(result).toEqual({
        period: 'month',
        data: [{ category: 'Drinks', revenue: 100, units: 10, orders: 2 }],
      });
    });
  });

  describe('topProducts', () => {
    it('delegates to the repository with period boundaries', async () => {
      repository.topProducts.mockResolvedValue([
        { productId: 'p1', name: 'A', units: 5, revenue: 100 },
      ]);

      const result = await service.topProducts(user, { period: 'week' });

      expect(repository.topProducts).toHaveBeenCalledWith(
        'b1',
        expect.any(Date),
        expect.any(Date),
      );
      expect(result).toEqual({
        period: 'week',
        data: [{ productId: 'p1', name: 'A', units: 5, revenue: 100 }],
      });
    });
  });
});
