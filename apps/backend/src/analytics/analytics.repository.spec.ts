import { AnalyticsRepository } from './analytics.repository';
import type { EntityManager } from 'typeorm';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';

function createQbMock(overrides: Record<string, unknown> = {}) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
    getMany: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('AnalyticsRepository', () => {
  let repository: AnalyticsRepository;
  let transactionFn: jest.Mock;
  let manager: EntityManager;

  const managerMock = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(() => {
    transactionFn = jest.fn();
    manager = managerMock as unknown as EntityManager;
    repository = new AnalyticsRepository({
      createEntityManager: jest.fn().mockReturnValue(manager),
      transaction: transactionFn,
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('transaction', () => {
    it('delegates to the underlying dataSource transaction', async () => {
      transactionFn.mockResolvedValue('result');

      await expect(
        repository.transaction(() => Promise.resolve('inner')),
      ).resolves.toBe('result');
      expect(transactionFn).toHaveBeenCalled();
    });
  });

  describe('summary', () => {
    it('aggregates revenue, orders and net profit filtered by businessId', async () => {
      const qb = createQbMock({
        getRawOne: jest.fn().mockResolvedValue({
          revenue: '250.00',
          orders: '5',
          netProfit: '90.00',
        }),
      });
      const createQbSpy = jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(qb as never);

      const result = await repository.summary('b1');

      expect(createQbSpy).toHaveBeenCalledWith('s');
      expect(qb.innerJoin).toHaveBeenCalledWith(
        SaleItem,
        'si',
        'si.saleId = s.id',
      );
      expect(qb.leftJoin).toHaveBeenCalledWith(
        InventoryItem,
        'ii',
        'ii.id = si.productId AND ii.businessId = :businessId',
      );
      expect(qb.where).toHaveBeenCalledWith('s.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith("s.status = 'completed'");
      expect(qb.getRawOne).toHaveBeenCalled();
      expect(result).toEqual({ revenue: 250, orders: 5, netProfit: 90 });
    });

    it('applies the createdAt range when from and to are provided', async () => {
      const qb = createQbMock();
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      const from = new Date('2024-06-01T00:00:00.000Z');
      const to = new Date('2024-06-15T23:59:59.999Z');

      await repository.summary('b1', from, to);

      expect(qb.andWhere).toHaveBeenCalledWith(
        's.createdAt BETWEEN :from AND :to',
        { from, to },
      );
    });

    it('returns zeros when no rows match', async () => {
      const qb = createQbMock();
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      await expect(repository.summary('b1')).resolves.toEqual({
        revenue: 0,
        orders: 0,
        netProfit: 0,
      });
    });
  });

  describe('timeSeries', () => {
    it('groups sales into hourly buckets for the given range', async () => {
      const qb = createQbMock({
        getRawMany: jest.fn().mockResolvedValue([
          {
            bucket: '2024-06-15T10:00:00.000Z',
            revenue: '30.00',
            orders: '1',
          },
        ]),
      });
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      const from = new Date('2024-06-15T00:00:00.000Z');
      const to = new Date('2024-06-15T23:59:59.999Z');

      const result = await repository.timeSeries('b1', from, to, 'hour');

      expect(qb.select).toHaveBeenCalledWith(
        "date_trunc('hour', s.createdAt)",
        'bucket',
      );
      expect(qb.groupBy).toHaveBeenCalledWith(
        "date_trunc('hour', s.createdAt)",
      );
      expect(qb.orderBy).toHaveBeenCalledWith('bucket', 'ASC');
      expect(result).toEqual([
        {
          bucket: new Date('2024-06-15T10:00:00.000Z'),
          revenue: 30,
          orders: 1,
        },
      ]);
    });

    it('supports day and week truncation units', async () => {
      const dayQb = createQbMock();
      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValueOnce(dayQb as never);
      await repository.timeSeries('b1', new Date(), new Date(), 'day');
      expect(dayQb.select).toHaveBeenCalledWith(
        "date_trunc('day', s.createdAt)",
        'bucket',
      );

      const weekQb = createQbMock();
      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValueOnce(weekQb as never);
      await repository.timeSeries('b1', new Date(), new Date(), 'week');
      expect(weekQb.select).toHaveBeenCalledWith(
        "date_trunc('week', s.createdAt)",
        'bucket',
      );
    });
  });

  describe('categoryBreakdown', () => {
    it('expands multi-category products via unnest and groups by category', async () => {
      const qb = createQbMock({
        getRawMany: jest.fn().mockResolvedValue([
          { category: 'Drinks', units: '10', revenue: '100.00', orders: '2' },
          { category: 'Snacks', units: '5', revenue: '50.00', orders: '1' },
        ]),
      });
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      const result = await repository.categoryBreakdown(
        'b1',
        new Date(),
        new Date(),
      );

      expect(qb.select).toHaveBeenCalledWith('unnest(ii.category)', 'category');
      expect(qb.groupBy).toHaveBeenCalledWith('category');
      expect(qb.orderBy).toHaveBeenCalledWith('revenue', 'DESC');
      expect(result).toEqual([
        { category: 'Drinks', units: 10, revenue: 100, orders: 2 },
        { category: 'Snacks', units: 5, revenue: 50, orders: 1 },
      ]);
    });
  });

  describe('topProducts', () => {
    it('ranks products by revenue descending with an optional limit', async () => {
      const qb = createQbMock({
        getRawMany: jest
          .fn()
          .mockResolvedValue([
            { productId: 'p1', name: 'A', units: '10', revenue: '100.00' },
          ]),
      });
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      const result = await repository.topProducts(
        'b1',
        new Date(),
        new Date(),
        5,
      );

      expect(qb.groupBy).toHaveBeenCalledWith('ii.id');
      expect(qb.addGroupBy).toHaveBeenCalledWith('ii.name');
      expect(qb.orderBy).toHaveBeenCalledWith('revenue', 'DESC');
      expect(qb.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual([
        { productId: 'p1', name: 'A', units: 10, revenue: 100 },
      ]);
    });

    it('skips the date range when from and to are not provided', async () => {
      const qb = createQbMock();
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      await repository.topProducts('b1');

      expect(qb.andWhere).toHaveBeenCalledWith("s.status = 'completed'");
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        's.createdAt BETWEEN :from AND :to',
        expect.anything(),
      );
    });
  });

  describe('recentSales', () => {
    it('returns the latest sales for the business ordered by createdAt', async () => {
      const qb = createQbMock({
        getRawMany: jest.fn().mockResolvedValue([
          {
            id: 's1',
            total: '100.00',
            status: 'completed',
            saleDate: '2024-06-15',
            customerName: 'Customer',
            paymentMethod: 'cash',
          },
        ]),
      });
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      const result = await repository.recentSales('b1', 5);

      expect(qb.orderBy).toHaveBeenCalledWith('s.createdAt', 'DESC');
      expect(qb.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual([
        {
          id: 's1',
          total: 100,
          status: 'completed',
          saleDate: new Date('2024-06-15'),
          customerName: 'Customer',
          paymentMethod: 'cash',
        },
      ]);
    });
  });

  describe('inventoryBreakdown', () => {
    it('counts products by status and returns low-stock alerts', async () => {
      const countsQb = createQbMock({
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'in-stock', count: '2' },
          { status: 'low-stock', count: '1' },
          { status: 'out-of-stock', count: '1' },
        ]),
      });
      const lowStockQb = createQbMock({
        getMany: jest.fn().mockResolvedValue([{ id: 'p1' } as InventoryItem]),
      });
      managerMock.createQueryBuilder
        .mockReturnValueOnce(countsQb)
        .mockReturnValueOnce(lowStockQb);

      const result = await repository.inventoryBreakdown('b1');

      expect(countsQb.groupBy).toHaveBeenCalledWith('item.status');
      expect(lowStockQb.andWhere).toHaveBeenCalledWith(
        'item.status IN (:...statuses)',
        { statuses: ['low-stock', 'out-of-stock'] },
      );
      expect(result).toEqual({
        totalProducts: 4,
        byStatus: { 'in-stock': 2, 'low-stock': 1, 'out-of-stock': 1 },
        lowStockItems: [{ id: 'p1' }],
      });
    });
  });
});
