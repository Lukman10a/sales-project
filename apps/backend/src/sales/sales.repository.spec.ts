import { HELD_TTL_MS, SalesRepository } from './sales.repository';
import { TenantMismatchError } from '../common/tenancy/assert-tenant';
import { In, type EntityManager } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { HeldTransaction } from '../entities/held-transaction.entity';
import { User } from '../entities/user.entity';

describe('SalesRepository', () => {
  let repository: SalesRepository;
  let transactionFn: jest.Mock;
  let manager: EntityManager;

  const managerMock = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((_entity: unknown, data: unknown) => data),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    transactionFn = jest.fn();
    manager = managerMock as unknown as EntityManager;
    repository = new SalesRepository({
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

  const lockQb = (rows: unknown) => {
    const qb = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
      getOne: jest.fn().mockResolvedValue(rows),
    };
    managerMock.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  describe('lockProducts', () => {
    it('locks the business products FOR UPDATE in id order', async () => {
      const rows = [{ id: 'a' }, { id: 'b' }];
      const qb = lockQb(rows);

      await expect(
        repository.lockProducts('b1', manager, ['b', 'a']),
      ).resolves.toBe(rows);
      expect(managerMock.createQueryBuilder).toHaveBeenCalledWith(
        InventoryItem,
        'p',
      );
      expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(qb.where).toHaveBeenCalledWith('p.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('p.id IN (:...ids)', {
        ids: ['a', 'b'],
      });
      expect(qb.orderBy).toHaveBeenCalledWith('p.id', 'ASC');
    });

    it('locks nothing for no ids', async () => {
      managerMock.createQueryBuilder.mockClear();
      await expect(repository.lockProducts('b1', manager, [])).resolves.toEqual(
        [],
      );
      expect(managerMock.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('findProducts', () => {
    it('reads catalogue rows of the business', async () => {
      managerMock.find.mockResolvedValue([]);
      await repository.findProducts('b1', ['p1']);
      expect(managerMock.find).toHaveBeenCalledWith(InventoryItem, {
        where: { businessId: 'b1', id: In(['p1']) },
      });
    });
  });

  describe('lockSale', () => {
    it('locks the sale row, then loads its lines', async () => {
      const sale = { id: 's1', businessId: 'b1' } as Sale;
      const qb = lockQb(sale);
      const lines = [{ id: 'l1' }];
      managerMock.find.mockResolvedValue(lines);

      const result = await repository.lockSale('b1', manager, 's1');

      expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'sale.businessId = :businessId',
        { businessId: 'b1' },
      );
      expect(managerMock.find).toHaveBeenCalledWith(SaleItem, {
        where: { saleId: 's1' },
        order: { createdAt: 'ASC', id: 'ASC' },
      });
      expect(result?.items).toBe(lines);
    });

    it('returns null for a sale outside the business', async () => {
      lockQb(null);
      await expect(
        repository.lockSale('b1', manager, 's1'),
      ).resolves.toBeNull();
    });
  });

  describe('business settings', () => {
    it('reads VAT from the owner row, off when missing', async () => {
      managerMock.findOne.mockResolvedValueOnce({ vatEnabled: true });
      await expect(repository.vatEnabled('b1', manager)).resolves.toBe(true);
      expect(managerMock.findOne).toHaveBeenCalledWith(User, {
        where: { id: 'b1' },
        select: ['id', 'vatEnabled'],
      });
      managerMock.findOne.mockResolvedValueOnce(null);
      await expect(repository.vatEnabled('b1', manager)).resolves.toBe(false);
    });

    it('stores VAT on the owner row', async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      (managerMock as Record<string, unknown>).update = update;
      await repository.setVatEnabled('b1', true);
      expect(update).toHaveBeenCalledWith(
        User,
        { id: 'b1' },
        { vatEnabled: true },
      );
    });
  });

  describe('nextReceiptNumber', () => {
    it('bumps the business counter in the transaction', async () => {
      const query = jest.fn().mockResolvedValue([{ lastNumber: '1218' }]);
      const tx = { query } as unknown as EntityManager;

      await expect(repository.nextReceiptNumber('b1', tx)).resolves.toBe(1218);
      const [sql, params] = query.mock.lastCall as [string, unknown[]];
      expect(sql).toContain('ON CONFLICT ("businessId") DO UPDATE');
      expect(params).toEqual(['b1']);
    });
  });

  describe('idempotency keys', () => {
    it('claims a new or expired key', async () => {
      const query = jest.fn().mockResolvedValue([{ key: 'k' }]);
      const tx = { query } as unknown as EntityManager;

      await expect(
        repository.claimIdempotencyKey('b1', tx, 'k', 'h'),
      ).resolves.toEqual({ claimed: true });
      const [sql, params] = query.mock.lastCall as [string, unknown[]];
      expect(sql).toContain('WHERE "idempotency_keys"."expiresAt" <= now()');
      expect(sql).toContain("interval '24 hours'");
      expect(params).toEqual(['b1', 'k', 'h']);
    });

    it('reports the earlier request for a live key', async () => {
      const findOneOrFail = jest
        .fn()
        .mockResolvedValue({ requestHash: 'h0', saleId: 's0' });
      const tx = {
        query: jest.fn().mockResolvedValue([]),
        findOneOrFail,
      } as unknown as EntityManager;

      await expect(
        repository.claimIdempotencyKey('b1', tx, 'k', 'h'),
      ).resolves.toEqual({ claimed: false, requestHash: 'h0', saleId: 's0' });
    });

    it('links the key to the sale it made', async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      const tx = { update } as unknown as EntityManager;
      await repository.completeIdempotencyKey('b1', tx, 'k', 's1');
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        { businessId: 'b1', key: 'k' },
        { saleId: 's1' },
      );
    });
  });

  describe('saveSale', () => {
    it('saves the sale through the manager', async () => {
      const sale = { id: 's1', businessId: 'b1' } as Sale;
      managerMock.save.mockResolvedValue(sale);

      await expect(repository.saveSale('b1', manager, sale)).resolves.toBe(
        sale,
      );
      expect(managerMock.save).toHaveBeenCalledWith(sale);
    });
  });

  describe('createSale', () => {
    it('creates the sale and its server-priced lines, then saves', async () => {
      const saved = { id: 's1' } as Sale;
      managerMock.create.mockImplementation(
        (_e: unknown, data: unknown) => data,
      );
      managerMock.save.mockResolvedValue(saved);
      const line = {
        productId: 'p1',
        productName: 'Widget',
        unit: 'carton' as const,
        quantity: 2,
        unitsPerItem: 12,
        price: 1000,
        total: 2000,
      };

      const result = await repository.createSale('b1', manager, {
        receiptNumber: 7,
        subtotal: 2000,
        discountAmount: 0,
        vatAmount: 0,
        total: 2000,
        paymentMethod: 'cash',
        status: 'completed',
        saleDate: new Date('2026-01-01'),
        soldBy: 'u1',
        discountPercent: 0,
        items: [line],
      });

      expect(managerMock.create).toHaveBeenCalledWith(SaleItem, line);
      expect(managerMock.create).toHaveBeenCalledWith(
        Sale,
        expect.objectContaining({
          businessId: 'b1',
          receiptNumber: 7,
          items: [line],
        }),
      );
      expect(result).toBe(saved);
    });
  });

  describe('findSaleWithItems', () => {
    it('finds a sale with its line items via the manager', async () => {
      const sale = { id: 's1', items: [] } as unknown as Sale;
      managerMock.findOne.mockResolvedValue(sale);

      await expect(
        repository.findSaleWithItems('b1', manager, 's1'),
      ).resolves.toBe(sale);
      expect(managerMock.findOne).toHaveBeenCalledWith(Sale, {
        where: { id: 's1', businessId: 'b1' },
        relations: ['items'],
      });
    });
  });

  describe('findSaleWithItemsDirect', () => {
    it('loads a sale with its items filtered by businessId', async () => {
      const sale = { id: 's1', items: [] } as unknown as Sale;
      const findOne = jest.spyOn(repository, 'findOne').mockResolvedValue(sale);

      await expect(
        repository.findSaleWithItemsDirect('b1', 's1'),
      ).resolves.toBe(sale);
      expect(findOne).toHaveBeenCalledWith({
        where: { id: 's1', businessId: 'b1' },
        relations: ['items'],
      });
    });
  });

  describe('resolveSellerNames', () => {
    it('maps user ids to full names without loading full user rows', async () => {
      const users = [
        { id: 'u1', firstName: 'Ada', lastName: 'Lovelace' },
        { id: 'u2', firstName: 'Grace', lastName: 'Hopper' },
      ];
      managerMock.find.mockResolvedValue(users);

      const result = await repository.resolveSellerNames('b1', ['u1', 'u2']);

      expect(managerMock.find).toHaveBeenCalledWith(User, {
        where: { id: In(['u1', 'u2']), businessId: 'b1' },
        select: ['id', 'firstName', 'lastName'],
      });
      expect(result.get('u1')).toBe('Ada Lovelace');
      expect(result.get('u2')).toBe('Grace Hopper');
    });

    it('returns an empty map for an empty id list', async () => {
      managerMock.find.mockClear();
      const result = await repository.resolveSellerNames('b1', []);

      expect(managerMock.find).not.toHaveBeenCalled();
      expect(result.size).toBe(0);
    });
  });

  describe('list', () => {
    it('filters by businessId with pagination and returns a summary', async () => {
      const sales = [{ id: 's1' } as Sale];
      const getManyAndCount = jest.fn().mockResolvedValue([sales, 1]);
      const getRawOne = jest.fn().mockResolvedValue({
        totalSales: '100.00',
        totalTransactions: '1',
      });
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        getManyAndCount,
        getRawOne,
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      const result = await repository.list('b1', {
        page: 1,
        limit: 20,
      });

      expect(qb.where).toHaveBeenCalledWith('sale.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(qb.getRawOne).toHaveBeenCalled();
      expect(result.data).toEqual(sales);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
      expect(result.summary).toEqual({
        totalSales: 100,
        totalTransactions: 1,
        averageTransaction: 100,
      });
    });

    it('loads an itemCount relation count onto each sale row', async () => {
      const sales = [{ id: 's1' } as Sale];
      const loadRelationCountAndMap = jest.fn().mockReturnThis();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap,
        getManyAndCount: jest.fn().mockResolvedValue([sales, 1]),
        getRawOne: jest.fn().mockResolvedValue({
          totalSales: '100.00',
          totalTransactions: '1',
        }),
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      const result = await repository.list('b1', {
        page: 1,
        limit: 20,
      });

      expect(loadRelationCountAndMap).toHaveBeenCalledWith(
        'sale.itemCount',
        'sale.items',
      );
      expect(result.data).toEqual(sales);
    });

    it('applies date, payment method and status filters when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getRawOne: jest.fn().mockResolvedValue({
          totalSales: '0',
          totalTransactions: '0',
        }),
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      await repository.list('b1', {
        page: 1,
        limit: 20,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        paymentMethod: 'cash',
        status: 'completed',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('sale.saleDate >= :dateFrom', {
        dateFrom: '2024-01-01',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('sale.saleDate <= :dateTo', {
        dateTo: '2024-01-31',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'sale.paymentMethod = :paymentMethod',
        { paymentMethod: 'cash' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('sale.status = :status', {
        status: 'completed',
      });
    });
  });

  describe('held transactions', () => {
    it("lists the creator's non-expired held transactions", async () => {
      const held = [{ id: 'h1' } as HeldTransaction];
      const getMany = jest.fn().mockResolvedValue(held);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany,
      };
      managerMock.createQueryBuilder.mockReturnValue(qb);

      const result = await repository.listHeld('b1', 'u1');

      expect(managerMock.createQueryBuilder).toHaveBeenCalledWith(
        HeldTransaction,
        'held',
      );
      expect(qb.where).toHaveBeenCalledWith('held.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('held.heldBy = :heldBy', {
        heldBy: 'u1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'held.expiresAt > :now',
        expect.objectContaining({ now: expect.any(Date) as Date }),
      );
      expect(result).toEqual(held);
    });

    it('finds a held transaction by id, business and creator', async () => {
      const held = { id: 'h1', businessId: 'b1' } as HeldTransaction;
      managerMock.findOne.mockResolvedValue(held);

      await expect(repository.findHeld('b1', 'u1', 'h1')).resolves.toBe(held);
      expect(managerMock.findOne).toHaveBeenCalledWith(HeldTransaction, {
        where: { id: 'h1', businessId: 'b1', heldBy: 'u1' },
      });
    });

    it('creates and saves a held transaction', async () => {
      const held = { id: 'h1' } as HeldTransaction;
      managerMock.create.mockReturnValue(held);
      managerMock.save.mockResolvedValue(held);

      const data = {
        customerName: 'Customer',
        items: [{ productId: 'p1', quantity: 1, unit: 'unit' as const }],
        heldBy: 'u1',
        discountPercent: 0,
        paymentMethod: 'cash' as const,
      };

      const result = await repository.createHeld('b1', data);

      expect(managerMock.create).toHaveBeenCalledWith(HeldTransaction, {
        ...data,
        businessId: 'b1',
        expiresAt: expect.any(Date) as Date,
      });
      const { expiresAt } = (
        managerMock.create.mock.lastCall as [unknown, { expiresAt: Date }]
      )[1];
      expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(
        HELD_TTL_MS - 60_000,
      );
      expect(managerMock.save).toHaveBeenCalledWith(held);
      expect(result).toBe(held);
    });

    it('removes a held transaction', async () => {
      const held = { id: 'h1', businessId: 'b1' } as HeldTransaction;
      managerMock.remove.mockResolvedValue(held);

      await repository.removeHeld('b1', held);

      expect(managerMock.remove).toHaveBeenCalledWith(held);
    });

    it("refuses to touch another business's rows", async () => {
      managerMock.remove.mockClear();
      managerMock.save.mockClear();
      const held = { id: 'h1', businessId: 'other' } as HeldTransaction;
      await expect(repository.removeHeld('b1', held)).rejects.toThrow(
        TenantMismatchError,
      );
      expect(() =>
        repository.saveSale('b1', manager, { businessId: 'other' } as Sale),
      ).toThrow(TenantMismatchError);
      expect(managerMock.remove).not.toHaveBeenCalled();
      expect(managerMock.save).not.toHaveBeenCalled();
    });
  });
});
