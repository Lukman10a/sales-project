import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';
import { Sale } from '../entities/sale.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { HeldTransaction } from '../entities/held-transaction.entity';

describe('SalesService', () => {
  let service: SalesService;
  let repository: {
    transaction: jest.Mock;
    findProduct: jest.Mock;
    saveProduct: jest.Mock;
    createSale: jest.Mock;
    saveSale: jest.Mock;
    findSaleWithItems: jest.Mock;
    findSaleByIdAndBusiness: jest.Mock;
    findSaleWithItemsDirect: jest.Mock;
    list: jest.Mock;
    createHeld: jest.Mock;
    listHeld: jest.Mock;
    findHeld: jest.Mock;
    removeHeld: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };

  const user = { id: 'u1', businessId: 'b1' };

  const product = {
    id: 'p1',
    businessId: 'b1',
    name: 'Widget',
    quantity: 10,
    sold: 0,
    reorderPoint: 3,
    status: 'in-stock',
  } as unknown as InventoryItem;

  beforeEach(() => {
    repository = {
      transaction: jest.fn(),
      findProduct: jest.fn(),
      saveProduct: jest.fn(),
      createSale: jest.fn(),
      saveSale: jest.fn(),
      findSaleWithItems: jest.fn(),
      findSaleByIdAndBusiness: jest.fn(),
      findSaleWithItemsDirect: jest.fn(),
      list: jest.fn(),
      createHeld: jest.fn(),
      listHeld: jest.fn(),
      findHeld: jest.fn(),
      removeHeld: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };

    service = new SalesService(
      repository as unknown as SalesRepository,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('records a sale atomically, decrements stock and emits sale.completed', async () => {
      const sale = { id: 's1', total: 90 } as unknown as Sale;
      repository.transaction.mockImplementation(
        async (fn: (manager: never) => Promise<unknown>) => {
          const manager = {} as never;
          repository.findProduct.mockResolvedValue({
            ...product,
            quantity: 10,
          });
          repository.saveProduct.mockImplementation(
            (_m: never, p: InventoryItem) => Promise.resolve(p),
          );
          repository.createSale.mockResolvedValue(sale);
          return fn(manager);
        },
      );

      const dto = {
        items: [{ productId: 'p1', quantity: 2, price: 50 }],
        paymentMethod: 'cash' as const,
        discountPercent: 10,
      };

      const result = await service.create(user, dto);

      expect(repository.findProduct).toHaveBeenCalledWith(
        expect.anything(),
        'p1',
        'b1',
      );
      expect(repository.saveProduct).toHaveBeenCalled();
      expect(repository.createSale).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('sale.completed', {
        businessId: 'b1',
        sale,
      });
      expect(result).toBe(sale);
    });

    it('throws BadRequestException when stock is insufficient', async () => {
      repository.transaction.mockImplementation(
        async (fn: (manager: never) => Promise<unknown>) => {
          repository.findProduct.mockResolvedValue({
            ...product,
            quantity: 1,
          });
          return fn({} as never);
        },
      );

      const dto = {
        items: [{ productId: 'p1', quantity: 5, price: 50 }],
        paymentMethod: 'cash' as const,
      };

      await expect(service.create(user, dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.saveProduct).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the product does not exist', async () => {
      repository.transaction.mockImplementation(
        async (fn: (manager: never) => Promise<unknown>) => {
          repository.findProduct.mockResolvedValue(null);
          return fn({} as never);
        },
      );

      const dto = {
        items: [{ productId: 'missing', quantity: 1, price: 50 }],
        paymentMethod: 'cash' as const,
      };

      await expect(service.create(user, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('emits inventory.low-stock when a product drops to low stock', async () => {
      repository.transaction.mockImplementation(
        async (fn: (manager: never) => Promise<unknown>) => {
          repository.findProduct.mockResolvedValue(product);
          repository.saveProduct.mockResolvedValue(product);
          repository.createSale.mockResolvedValue({ id: 's1' });
          return fn({} as never);
        },
      );

      await service.create(user, {
        items: [{ productId: 'p1', quantity: 8, price: 50 }],
        paymentMethod: 'cash' as const,
      });

      const expectedItem = {
        ...product,
        quantity: 2,
        sold: 8,
        status: 'low-stock',
      };
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory.low-stock',
        expect.objectContaining({
          businessId: 'b1',
          item: expectedItem,
        }),
      );
    });
  });

  describe('list', () => {
    it('delegates to the repository with the businessId and query', async () => {
      const result = { data: [], pagination: {}, summary: {} };
      repository.list.mockResolvedValue(result);

      const query = {
        page: 1,
        limit: 20,
        dateFrom: new Date('2024-01-01'),
      } as never;

      await expect(service.list(user, query)).resolves.toBe(result);
      expect(repository.list).toHaveBeenCalledWith({
        businessId: 'b1',
        page: 1,
        limit: 20,
        dateFrom: '2024-01-01',
        dateTo: undefined,
        paymentMethod: undefined,
        status: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the sale is missing', async () => {
      repository.findSaleWithItemsDirect.mockResolvedValue(null);

      await expect(service.findOne(user, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the sale with items for the business', async () => {
      const sale = { id: 's1', items: [] } as unknown as Sale;
      repository.findSaleWithItemsDirect.mockResolvedValue(sale);

      await expect(service.findOne(user, 's1')).resolves.toBe(sale);
      expect(repository.findSaleWithItemsDirect).toHaveBeenCalledWith(
        's1',
        'b1',
      );
    });
  });

  describe('refund', () => {
    it('throws NotFoundException when the sale is missing', async () => {
      repository.transaction.mockImplementation(
        async (fn: (manager: never) => Promise<unknown>) => {
          repository.findSaleWithItems.mockResolvedValue(null);
          return fn({} as never);
        },
      );

      await expect(service.refund(user, 'missing', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws BadRequestException when the sale is already refunded', async () => {
      repository.transaction.mockImplementation(
        async (fn: (manager: never) => Promise<unknown>) => {
          repository.findSaleWithItems.mockResolvedValue({
            id: 's1',
            status: 'refunded',
            items: [],
          });
          return fn({} as never);
        },
      );

      await expect(service.refund(user, 's1', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('restores inventory quantities and marks the sale refunded', async () => {
      const sale = {
        id: 's1',
        status: 'completed',
        total: 100,
        refundAmount: undefined,
        refundReason: undefined,
        items: [{ productId: 'p1', quantity: 2 }],
      } as unknown as Sale;
      repository.transaction.mockImplementation(
        async (fn: (manager: never) => Promise<unknown>) => {
          repository.findSaleWithItems.mockResolvedValue(sale);
          repository.findProduct.mockResolvedValue({
            ...product,
            quantity: 8,
            sold: 2,
          });
          repository.saveProduct.mockImplementation(
            (_m: never, p: InventoryItem) => Promise.resolve(p),
          );
          repository.saveSale.mockResolvedValue(sale);
          return fn({} as never);
        },
      );

      const dto = { refundAmount: 100, refundReason: 'customer request' };

      const result = await service.refund(user, 's1', dto);

      expect(repository.saveProduct).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ quantity: 10, sold: 0 }),
      );
      expect(sale.status).toBe('refunded');
      expect(sale.refundAmount).toBe(100);
      expect(sale.refundReason).toBe('customer request');
      expect(repository.saveSale).toHaveBeenCalledWith(expect.anything(), sale);
      expect(result).toBe(sale);
    });
  });

  describe('held transactions', () => {
    it('creates a held transaction for the user', async () => {
      const held = { id: 'h1' } as unknown as HeldTransaction;
      repository.createHeld.mockResolvedValue(held);

      const dto = {
        customerName: 'Customer',
        items: [{ productId: 'p1', quantity: 1, price: 10 }],
        paymentMethod: 'cash' as const,
        discountPercent: 0,
      };

      const result = await service.createHeld(user, dto);

      expect(repository.createHeld).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'b1',
          heldBy: 'u1',
          customerName: 'Customer',
          items: dto.items,
        }),
      );
      expect(result).toBe(held);
    });

    it('lists active held transactions for the business', async () => {
      const held = [{ id: 'h1' }] as unknown as HeldTransaction[];
      repository.listHeld.mockResolvedValue(held);

      await expect(service.listHeld(user)).resolves.toBe(held);
      expect(repository.listHeld).toHaveBeenCalledWith('b1');
    });

    it('throws NotFoundException when removing a missing held transaction', async () => {
      repository.findHeld.mockResolvedValue(null);

      await expect(service.removeHeld(user, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes an existing held transaction', async () => {
      const held = { id: 'h1' } as unknown as HeldTransaction;
      repository.findHeld.mockResolvedValue(held);

      await service.removeHeld(user, 'h1');

      expect(repository.removeHeld).toHaveBeenCalledWith(held);
    });
  });
});
