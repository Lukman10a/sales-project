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

  describe('findProduct', () => {
    it('finds an inventory item by id and businessId via the manager', async () => {
      const product = { id: 'p1', businessId: 'b1' } as InventoryItem;
      managerMock.findOne.mockResolvedValue(product);

      await expect(repository.findProduct('b1', manager, 'p1')).resolves.toBe(
        product,
      );
      expect(managerMock.findOne).toHaveBeenCalledWith(InventoryItem, {
        where: { id: 'p1', businessId: 'b1' },
      });
    });
  });

  describe('saveProduct', () => {
    it('saves the product through the manager', async () => {
      const product = { id: 'p1', businessId: 'b1' } as InventoryItem;
      managerMock.save.mockResolvedValue(product);

      await expect(
        repository.saveProduct('b1', manager, product),
      ).resolves.toBe(product);
      expect(managerMock.save).toHaveBeenCalledWith(product);
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
    it('creates the sale and its line items then saves through the manager', async () => {
      const sale = { id: 's1' } as Sale;
      managerMock.save.mockResolvedValue(sale);

      const result = await repository.createSale('b1', manager, {
        total: 100,
        paymentMethod: 'cash',
        status: 'completed',
        saleDate: new Date('2024-01-01'),
        soldBy: 'u1',
        discountPercent: 0,
        items: [
          {
            productId: 'p1',
            quantity: 2,
            price: 50,
            productName: 'Widget',
          },
        ],
      });

      expect(managerMock.create).toHaveBeenCalledWith(Sale, {
        businessId: 'b1',
        total: 100,
        paymentMethod: 'cash',
        status: 'completed',
        saleDate: new Date('2024-01-01'),
        soldBy: 'u1',
        discountPercent: 0,
        items: [
          expect.objectContaining({
            productId: 'p1',
            quantity: 2,
            price: 50,
            productName: 'Widget',
            total: 100,
          }),
        ],
      });
      expect(managerMock.create).toHaveBeenCalledWith(SaleItem, {
        productId: 'p1',
        quantity: 2,
        price: 50,
        productName: 'Widget',
        total: 100,
      });
      expect(managerMock.save).toHaveBeenCalled();
      expect(result).toBe(sale);
    });

    it('computes each line item total as price * quantity', async () => {
      const sale = { id: 's1' } as Sale;
      managerMock.save.mockResolvedValue(sale);

      await repository.createSale('b1', manager, {
        total: 100,
        paymentMethod: 'cash',
        status: 'completed',
        saleDate: new Date('2024-01-01'),
        soldBy: 'u1',
        discountPercent: 0,
        items: [
          {
            productId: 'p1',
            quantity: 2,
            price: 25.5,
            productName: 'Widget',
          },
        ],
      });

      expect(managerMock.create).toHaveBeenCalledWith(SaleItem, {
        productId: 'p1',
        quantity: 2,
        price: 25.5,
        productName: 'Widget',
        total: 51,
      });
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
    it('lists non-expired held transactions for the business', async () => {
      const held = [{ id: 'h1' } as HeldTransaction];
      const getMany = jest.fn().mockResolvedValue(held);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany,
      };
      managerMock.createQueryBuilder.mockReturnValue(qb);

      const result = await repository.listHeld('b1');

      expect(managerMock.createQueryBuilder).toHaveBeenCalledWith(
        HeldTransaction,
        'held',
      );
      expect(qb.where).toHaveBeenCalledWith('held.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'held.expiresAt > :now',
        expect.objectContaining({ now: expect.any(Date) as Date }),
      );
      expect(result).toEqual(held);
    });

    it('finds a held transaction by id and businessId', async () => {
      const held = { id: 'h1', businessId: 'b1' } as HeldTransaction;
      managerMock.findOne.mockResolvedValue(held);

      await expect(repository.findHeld('b1', 'h1')).resolves.toBe(held);
      expect(managerMock.findOne).toHaveBeenCalledWith(HeldTransaction, {
        where: { id: 'h1', businessId: 'b1' },
      });
    });

    it('creates and saves a held transaction', async () => {
      const held = { id: 'h1' } as HeldTransaction;
      managerMock.create.mockReturnValue(held);
      managerMock.save.mockResolvedValue(held);

      const data = {
        customerName: 'Customer',
        items: [{ productId: 'p1', quantity: 1, price: 10 }],
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
