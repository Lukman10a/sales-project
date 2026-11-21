import { InsightRepository } from './insight.repository';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Sale } from '../entities/sale.entity';
import type { EntityManager } from 'typeorm';

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

describe('InsightRepository', () => {
  let repository: InsightRepository;
  let manager: EntityManager;
  const managerMock: Record<string, jest.Mock> = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(() => {
    manager = managerMock as unknown as EntityManager;
    repository = new InsightRepository({
      createEntityManager: jest.fn().mockReturnValue(manager),
    } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('inventoryFacts', () => {
    it('queries inventory by businessId and maps prices', async () => {
      managerMock.find.mockResolvedValue([
        {
          id: 'p1',
          name: 'Widget',
          quantity: 10,
          reorderPoint: 5,
          costPrice: '10.00',
          sellingPrice: '20.00',
          category: ['Cat'],
        },
      ]);

      const facts = await repository.inventoryFacts('b1');

      expect(managerMock.find).toHaveBeenCalledWith(InventoryItem, {
        where: { businessId: 'b1' },
        relations: ['categories'],
      });
      expect(facts[0]).toEqual({
        productId: 'p1',
        name: 'Widget',
        quantity: 10,
        reorderPoint: 5,
        costPrice: 10,
        sellingPrice: 20,
        category: ['Cat'],
      });
    });
  });

  describe('salesVelocity', () => {
    it('scopes current and previous windows by businessId and completed status', async () => {
      const curQb = createQbMock({
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ productId: 'p1', units: '12' }]),
      });
      const prevQb = createQbMock({
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ productId: 'p1', units: '6' }]),
      });
      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValueOnce(curQb as never)
        .mockReturnValueOnce(prevQb as never);

      const from = new Date('2026-01-01');
      const to = new Date('2026-01-30');
      const pf = new Date('2025-12-01');
      const pt = new Date('2025-12-30');

      const rows = await repository.salesVelocity('b1', from, to, pf, pt);

      expect(curQb.where).toHaveBeenCalledWith('s.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(curQb.andWhere).toHaveBeenCalledWith("s.status = 'completed'");
      expect(curQb.andWhere).toHaveBeenCalledWith(
        's.createdAt BETWEEN :from AND :to',
        { from, to },
      );
      expect(prevQb.andWhere).toHaveBeenCalledWith(
        's.createdAt BETWEEN :previousFrom AND :previousTo',
        { previousFrom: pf, previousTo: pt },
      );
      expect(rows).toEqual([
        { productId: 'p1', unitsSold30d: 12, unitsSoldPrev30d: 6 },
      ]);
    });
  });

  describe('coPurchasePairs', () => {
    it('groups bought-together pairs by business and orders by count', async () => {
      const qb = createQbMock({
        getRawMany: jest.fn().mockResolvedValue([
          {
            productIdA: 'p1',
            productIdB: 'p2',
            nameA: 'A',
            nameB: 'B',
            count: '5',
          },
        ]),
      });
      managerMock.createQueryBuilder.mockReturnValue(qb);

      const pairs = await repository.coPurchasePairs('b1', 20);

      expect(managerMock.createQueryBuilder).toHaveBeenCalledWith(
        SaleItem,
        'a',
      );
      expect(qb.innerJoin).toHaveBeenCalledWith(Sale, 's', 's.id = a.saleId');
      expect(qb.where).toHaveBeenCalledWith('s.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(qb.orderBy).toHaveBeenCalledWith('count', 'DESC');
      expect(qb.limit).toHaveBeenCalledWith(20);
      expect(pairs[0]).toEqual({
        productIdA: 'p1',
        productIdB: 'p2',
        nameA: 'A',
        nameB: 'B',
        count: 5,
      });
    });
  });
});
