import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';
import { Sale } from '../entities/sale.entity';
import type { SaleItem } from '../entities/sale-item.entity';
import type { AuditService } from '../audit/audit.service';
import { InventoryItem } from '../entities/inventory-item.entity';
import { HeldTransaction } from '../entities/held-transaction.entity';
import { requestHash } from './idempotency';
import type { CreateSaleDto } from './dto/create-sale.dto';

describe('SalesService', () => {
  let audit: { record: jest.Mock };
  let service: SalesService;
  let repository: Record<string, jest.Mock>;
  let eventEmitter: { emit: jest.Mock };
  const manager = { tx: true };

  const user = {
    id: 'u1',
    businessId: 'b1',
    role: 'owner' as const,
    permissions: [],
    maxDiscountPercent: 100,
  };
  const cashier = {
    ...user,
    id: 'c1',
    role: 'cashier' as const,
    permissions: ['sales.record' as const],
    maxDiscountPercent: 0,
  };

  const productRow = (over: Partial<InventoryItem> = {}) =>
    ({
      id: 'p1',
      businessId: 'b1',
      name: 'Widget',
      sellingPrice: 100,
      bundleQuantity: 12,
      bundlePrice: 1000,
      quantity: 30,
      sold: 0,
      reorderPoint: 3,
      status: 'in-stock',
      ...over,
    }) as InventoryItem;

  const dto = (over: Partial<CreateSaleDto> = {}): CreateSaleDto => ({
    items: [{ productId: 'p1', quantity: 2, unit: 'unit' }],
    paymentMethod: 'cash',
    ...over,
  });

  const created = () =>
    (
      repository.createSale.mock.lastCall as [
        string,
        unknown,
        Record<string, unknown>,
      ]
    )[2];

  beforeEach(() => {
    repository = {
      transaction: jest.fn((fn: (m: unknown) => unknown) => fn(manager)),
      claimIdempotencyKey: jest.fn().mockResolvedValue({ claimed: true }),
      completeIdempotencyKey: jest.fn().mockResolvedValue(undefined),
      lockProducts: jest.fn(),
      findProducts: jest.fn(),
      saveProduct: jest.fn((_b: string, _m: unknown, p: unknown) =>
        Promise.resolve(p),
      ),
      vatEnabled: jest.fn().mockResolvedValue(false),
      setVatEnabled: jest.fn().mockResolvedValue(undefined),
      nextReceiptNumber: jest.fn().mockResolvedValue(1218),
      createSale: jest.fn((_b: string, _m: unknown, data: object) =>
        Promise.resolve({ id: 's1', businessId: 'b1', ...data }),
      ),
      saveSale: jest.fn((_b: string, _m: unknown, s: unknown) =>
        Promise.resolve(s),
      ),
      findSaleWithItems: jest.fn(),
      lockSale: jest.fn(),
      findSaleWithItemsDirect: jest.fn(),
      resolveSellerNames: jest.fn(),
      list: jest.fn(),
      createHeld: jest.fn(),
      listHeld: jest.fn(),
      findHeld: jest.fn(),
      removeHeld: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    service = new SalesService(
      repository as unknown as SalesRepository,
      eventEmitter as unknown as EventEmitter2,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('charges the catalogue price, whatever the client sent', async () => {
      const product = productRow();
      repository.lockProducts.mockResolvedValue([product]);

      const sale = await service.create(user, dto(), 'key-1');

      expect(repository.lockProducts).toHaveBeenCalledWith('b1', manager, [
        'p1',
      ]);
      expect(created()).toMatchObject({
        receiptNumber: 1218,
        subtotal: 200,
        discountAmount: 0,
        vatAmount: 0,
        total: 200,
        items: [
          {
            productId: 'p1',
            productName: 'Widget',
            unit: 'unit',
            quantity: 2,
            unitsPerItem: 1,
            price: 100,
            total: 200,
          },
        ],
      });
      expect(product.quantity).toBe(28);
      expect(product.sold).toBe(2);
      expect(repository.completeIdempotencyKey).toHaveBeenCalledWith(
        'b1',
        manager,
        'key-1',
        's1',
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('sale.completed', {
        businessId: 'b1',
        sale,
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'sale.recorded',
          entityId: 's1',
          after: expect.objectContaining({
            receiptNumber: 1218,
            total: 200,
          }) as object,
        }),
      );
    });

    it('sells cartons at the carton price and takes carton-size stock', async () => {
      const product = productRow();
      repository.lockProducts.mockResolvedValue([product]);

      await service.create(
        user,
        dto({ items: [{ productId: 'p1', quantity: 2, unit: 'carton' }] }),
        'k',
      );

      expect(created()).toMatchObject({ subtotal: 2000, total: 2000 });
      expect(product.quantity).toBe(30 - 24);
    });

    it('refuses cartons for a product without a carton size', async () => {
      repository.lockProducts.mockResolvedValue([
        productRow({ bundleQuantity: undefined, bundlePrice: undefined }),
      ]);
      await expect(
        service.create(
          user,
          dto({ items: [{ productId: 'p1', quantity: 1, unit: 'carton' }] }),
          'k',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns 409 when stock is short, counting every line of the product', async () => {
      const product = productRow({ quantity: 3 });
      repository.lockProducts.mockResolvedValue([product]);

      await expect(
        service.create(
          user,
          dto({
            items: [
              { productId: 'p1', quantity: 2, unit: 'unit' },
              { productId: 'p1', quantity: 2, unit: 'unit' },
            ],
          }),
          'k',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(product.quantity).toBe(3);
      expect(repository.createSale).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when a product is not in the business', async () => {
      repository.lockProducts.mockResolvedValue([]);
      await expect(service.create(user, dto(), 'k')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('applies the discount and then VAT when the business charges it', async () => {
      repository.lockProducts.mockResolvedValue([productRow()]);
      repository.vatEnabled.mockResolvedValue(true);

      await service.create(user, dto({ discountPercent: 10 }), 'k');

      // 200 − 10% = 180; VAT 7.5% of 180 = 13.50.
      expect(created()).toMatchObject({
        subtotal: 200,
        discountAmount: 20,
        vatAmount: 13.5,
        total: 193.5,
        discountPercent: 10,
      });
    });

    it('accepts split payments that add up to the total exactly', async () => {
      repository.lockProducts.mockResolvedValue([productRow()]);
      await service.create(
        user,
        dto({
          paymentMethod: 'split',
          splitPayments: [
            { method: 'cash', amount: 50.5 },
            { method: 'transfer', amount: 149.5 },
          ],
        }),
        'k',
      );
      expect(created()).toMatchObject({ paymentMethod: 'split', total: 200 });
    });

    it('refuses split payments a kobo off the total', async () => {
      repository.lockProducts.mockResolvedValue([productRow()]);
      await expect(
        service.create(
          user,
          dto({
            paymentMethod: 'split',
            splitPayments: [
              { method: 'cash', amount: 100 },
              { method: 'card', amount: 99.99 },
            ],
          }),
          'k',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('emits inventory.low-stock when a product drops to low stock', async () => {
      repository.lockProducts.mockResolvedValue([productRow({ quantity: 4 })]);
      await service.create(user, dto(), 'k');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory.low-stock',
        expect.objectContaining({ businessId: 'b1' }),
      );
    });

    it('returns the original sale for a repeated key and body', async () => {
      const original = { id: 's0' } as Sale;
      repository.claimIdempotencyKey.mockResolvedValue({
        claimed: false,
        requestHash: requestHash(dto()),
        saleId: 's0',
      });
      repository.findSaleWithItems.mockResolvedValue(original);

      await expect(service.create(user, dto(), 'k')).resolves.toBe(original);
      expect(repository.lockProducts).not.toHaveBeenCalled();
      expect(repository.createSale).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('returns 422 when the key was used for a different body', async () => {
      repository.claimIdempotencyKey.mockResolvedValue({
        claimed: false,
        requestHash: requestHash(dto({ discountPercent: 5 })),
        saleId: 's0',
      });
      await expect(service.create(user, dto(), 'k')).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });
  });

  describe('discount limits', () => {
    it('refuses a discount from someone without sales.discount', async () => {
      await expect(
        service.create(cashier, dto({ discountPercent: 5 }), 'k'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.transaction).not.toHaveBeenCalled();
    });

    it("refuses a discount above the member's cap", async () => {
      const capped = {
        ...cashier,
        permissions: ['sales.record' as const, 'sales.discount' as const],
        maxDiscountPercent: 10,
      };
      await expect(
        service.create(capped, dto({ discountPercent: 11 }), 'k'),
      ).rejects.toBeInstanceOf(ForbiddenException);
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

      await expect(service.list(user, query)).resolves.toEqual({
        data: [],
        pagination: {},
        summary: {},
      });
      expect(repository.list).toHaveBeenCalledWith('b1', {
        page: 1,
        limit: 20,
        dateFrom: '2024-01-01',
        dateTo: undefined,
        paymentMethod: undefined,
        status: undefined,
      });
    });

    it('enriches each sale row with the seller full name', async () => {
      const sales = [{ id: 's1', soldBy: 'u1' } as Sale];
      repository.list.mockResolvedValue({
        data: sales,
        pagination: {},
        summary: {},
      });
      repository.resolveSellerNames.mockResolvedValue(
        new Map([['u1', 'Ada Lovelace']]),
      );

      const result = await service.list(user, {} as never);

      expect(repository.resolveSellerNames).toHaveBeenCalledWith('b1', ['u1']);
      expect(result.data[0].soldByName).toBe('Ada Lovelace');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the sale is missing', async () => {
      repository.findSaleWithItemsDirect.mockResolvedValue(null);

      await expect(service.findOne(user, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the sale with items and the seller full name for the business', async () => {
      const sale = { id: 's1', soldBy: 'u1', items: [] } as unknown as Sale;
      repository.findSaleWithItemsDirect.mockResolvedValue(sale);
      repository.resolveSellerNames.mockResolvedValue(
        new Map([['u1', 'Ada Lovelace']]),
      );

      const result = await service.findOne(user, 's1');

      expect(result).toEqual({ ...sale, soldByName: 'Ada Lovelace' });
      expect(repository.findSaleWithItemsDirect).toHaveBeenCalledWith(
        'b1',
        's1',
      );
    });
  });

  describe('refund', () => {
    const line = (over: Partial<SaleItem> = {}) =>
      ({
        id: 'l1',
        productId: 'p1',
        productName: 'Widget',
        unit: 'unit',
        quantity: 4,
        unitsPerItem: 1,
        refundedQuantity: 0,
        price: 100,
        ...over,
      }) as SaleItem;
    const sale = (items: SaleItem[], over: Partial<Sale> = {}) =>
      ({
        id: 's1',
        businessId: 'b1',
        status: 'completed',
        subtotal: 500,
        total: 450,
        refundAmount: undefined,
        items,
        ...over,
      }) as unknown as Sale;

    it('throws NotFoundException when the sale is missing', async () => {
      repository.lockSale.mockResolvedValue(null);
      await expect(
        service.refund(user, 'missing', { refundReason: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when the sale is already refunded', async () => {
      repository.lockSale.mockResolvedValue(
        sale([line()], { status: 'refunded' }),
      );
      await expect(
        service.refund(user, 's1', { refundReason: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('refunds the whole sale and puts all its stock back', async () => {
      const product = productRow({ quantity: 10, sold: 6 });
      repository.lockSale.mockResolvedValue(
        sale([
          line(),
          line({
            id: 'l2',
            unit: 'carton',
            quantity: 1,
            unitsPerItem: 12,
            price: 100,
          }),
        ]),
      );
      repository.lockProducts.mockResolvedValue([product]);

      const result = await service.refund(user, 's1', {
        refundReason: 'damaged',
      });

      expect(repository.lockProducts).toHaveBeenCalledWith('b1', manager, [
        'p1',
      ]);
      expect(product.quantity).toBe(10 + 4 + 12);
      expect(result).toMatchObject({
        status: 'refunded',
        refundAmount: 450,
        refundReason: 'damaged',
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'sale.refunded',
          after: expect.objectContaining({ refunded: 450 }) as object,
        }),
      );
    });

    it('refunds part of a line, in proportion to what was paid', async () => {
      const product = productRow({ quantity: 0 });
      const l1 = line();
      repository.lockSale.mockResolvedValue(sale([l1, line({ id: 'l2' })]));
      repository.lockProducts.mockResolvedValue([product]);

      const result = await service.refund(user, 's1', {
        refundReason: 'changed mind',
        items: [{ saleItemId: 'l1', quantity: 1 }],
      });

      // ₦100 of a ₦500 subtotal that was paid as ₦450 → ₦90 back.
      expect(result).toMatchObject({
        status: 'partial-refund',
        refundAmount: 90,
      });
      expect(l1.refundedQuantity).toBe(1);
      expect(product.quantity).toBe(1);
    });

    it('finishes a sale refunded in parts with exactly what is left', async () => {
      repository.lockSale.mockResolvedValue(
        sale([line({ refundedQuantity: 3 })], {
          status: 'partial-refund',
          subtotal: 400,
          total: 333.33,
          refundAmount: 250,
        }),
      );
      repository.lockProducts.mockResolvedValue([productRow()]);

      const result = await service.refund(user, 's1', { refundReason: 'rest' });
      expect(result).toMatchObject({
        status: 'refunded',
        refundAmount: 333.33,
      });
    });

    it('refuses to refund more than was sold', async () => {
      repository.lockSale.mockResolvedValue(
        sale([line({ refundedQuantity: 3 })]),
      );
      await expect(
        service.refund(user, 's1', {
          refundReason: 'x',
          items: [{ saleItemId: 'l1', quantity: 2 }],
        }),
      ).rejects.toThrow('only 1 left to refund');
      expect(repository.lockProducts).not.toHaveBeenCalled();
    });

    it('refuses a line from another sale', async () => {
      repository.lockSale.mockResolvedValue(sale([line()]));
      await expect(
        service.refund(user, 's1', {
          refundReason: 'x',
          items: [{ saleItemId: 'other', quantity: 1 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('held transactions', () => {
    it('stores the cart without prices', async () => {
      repository.createHeld.mockResolvedValue({ id: 'h1' });
      await service.createHeld(user, {
        customerName: 'Walk-in',
        items: [{ productId: 'p1', quantity: 2, unit: 'unit' }],
        paymentMethod: 'cash',
      });
      expect(repository.createHeld).toHaveBeenCalledWith('b1', {
        customerName: 'Walk-in',
        items: [{ productId: 'p1', quantity: 2, unit: 'unit' }],
        heldBy: 'u1',
        discountPercent: 0,
        paymentMethod: 'cash',
      });
    });

    it('refuses a held discount the member may not give', async () => {
      await expect(
        service.createHeld(cashier, {
          customerName: 'Walk-in',
          items: [{ productId: 'p1', quantity: 1, unit: 'unit' }],
          paymentMethod: 'cash',
          discountPercent: 5,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("lists only the caller's held sales, priced from today's catalogue", async () => {
      repository.listHeld.mockResolvedValue([
        {
          id: 'h1',
          items: [
            { productId: 'p1', quantity: 2, price: 1 },
            { productId: 'p1', quantity: 1, unit: 'carton' },
            { productId: 'gone', quantity: 1 },
          ],
        },
      ]);
      repository.findProducts.mockResolvedValue([
        productRow({ sellingPrice: 120 }),
      ]);

      const [held] = await service.listHeld(user);

      expect(repository.listHeld).toHaveBeenCalledWith('b1', 'u1');
      expect(held.items).toEqual([
        {
          productId: 'p1',
          productName: 'Widget',
          quantity: 2,
          unit: 'unit',
          price: 120,
        },
        {
          productId: 'p1',
          productName: 'Widget',
          quantity: 1,
          unit: 'carton',
          price: 1000,
        },
      ]);
    });

    it("cannot remove someone else's held sale", async () => {
      repository.findHeld.mockResolvedValue(null);
      await expect(service.removeHeld(cashier, 'h1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.findHeld).toHaveBeenCalledWith('b1', 'c1', 'h1');
    });

    it('removes the caller’s own held sale', async () => {
      const held = { id: 'h1' } as HeldTransaction;
      repository.findHeld.mockResolvedValue(held);
      await expect(service.removeHeld(user, 'h1')).resolves.toEqual({
        message: 'Held transaction removed successfully',
      });
      expect(repository.removeHeld).toHaveBeenCalledWith('b1', held);
    });
  });

  describe('settings', () => {
    it('reads and changes the business VAT setting', async () => {
      repository.vatEnabled.mockResolvedValue(true);
      await expect(
        service.updateSettings(user, { vatEnabled: true }),
      ).resolves.toEqual({ vatEnabled: true, vatPercent: 7.5 });
      expect(repository.setVatEnabled).toHaveBeenCalledWith('b1', true);
    });
  });
});
