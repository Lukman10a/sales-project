import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryService, calculateStatus } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import {
  NegativeStockError,
  StockLedgerRepository,
} from './stock-ledger.repository';
import type { AuditService } from '../audit/audit.service';
import { InventoryItem } from '../entities/inventory-item.entity';

describe('calculateStatus', () => {
  it('returns out-of-stock when quantity is 0 or less', () => {
    expect(calculateStatus(0)).toBe('out-of-stock');
    expect(calculateStatus(-1)).toBe('out-of-stock');
  });

  it('returns low-stock when quantity <= reorderPoint', () => {
    expect(calculateStatus(5, 5)).toBe('low-stock');
    expect(calculateStatus(3, 5)).toBe('low-stock');
  });

  it('returns in-stock otherwise', () => {
    expect(calculateStatus(10, 5)).toBe('in-stock');
    expect(calculateStatus(10)).toBe('in-stock');
    expect(calculateStatus(10, null)).toBe('in-stock');
  });
});

const csv = (text: string) => ({
  buffer: Buffer.from(text),
  mimetype: 'text/csv',
  originalname: 'stock.csv',
});

describe('InventoryService', () => {
  let audit: { record: jest.Mock };
  let service: InventoryService;
  let repository: Record<
    | 'list'
    | 'findById'
    | 'lockById'
    | 'findByBarcode'
    | 'ensureCategories'
    | 'listCategories'
    | 'findAllForImport'
    | 'createItem'
    | 'saveItem'
    | 'removeItem'
    | 'resolveCreatorNames'
    | 'transaction',
    jest.Mock
  >;
  let ledger: { move: jest.Mock; history: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const owner = {
    id: 'u1',
    businessId: 'b1',
    role: 'owner' as const,
    permissions: [],
    maxDiscountPercent: 100,
  };
  const stocker = {
    id: 'u2',
    businessId: 'b1',
    role: 'cashier' as const,
    permissions: ['products.restock' as const],
    maxDiscountPercent: 0,
  };
  const product = (over: Partial<InventoryItem> = {}) =>
    ({
      id: 'i1',
      businessId: 'b1',
      createdBy: 'u1',
      name: 'Widget',
      categories: [{ id: 'c1', name: 'tools' }],
      category: ['tools'],
      costPrice: 5,
      sellingPrice: 10,
      quantity: 10,
      sold: 0,
      reorderPoint: 3,
      status: 'in-stock',
      ...over,
    }) as unknown as InventoryItem;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findById: jest.fn(),
      lockById: jest.fn(),
      findByBarcode: jest.fn().mockResolvedValue(null),
      ensureCategories: jest.fn((_b: string, names: string[]) =>
        Promise.resolve(names.map((name, i) => ({ id: `c${i}`, name }))),
      ),
      listCategories: jest.fn(),
      findAllForImport: jest.fn().mockResolvedValue([]),
      createItem: jest.fn((businessId: string, data: object) => ({
        ...data,
        businessId,
      })),
      saveItem: jest.fn((_b: string, item: InventoryItem) =>
        Promise.resolve({ ...item, id: item.id ?? 'new-id' }),
      ),
      removeItem: jest.fn(),
      resolveCreatorNames: jest.fn().mockResolvedValue(new Map()),
      transaction: jest.fn(<T>(fn: () => Promise<T>) => fn()),
    };
    ledger = {
      move: jest.fn(
        (_b: string, p: InventoryItem, change: { delta: number }) => {
          p.quantity += change.delta;
          p.status = calculateStatus(p.quantity, p.reorderPoint);
          return Promise.resolve(p);
        },
      ),
      history: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    service = new InventoryService(
      repository as unknown as InventoryRepository,
      ledger as unknown as StockLedgerRepository,
      eventEmitter as unknown as EventEmitter2,
      audit as unknown as AuditService,
    );
  });

  describe('list', () => {
    it('passes the filters, including expiry, and names the creator', async () => {
      repository.list.mockResolvedValue({
        data: [product()],
        pagination: { total: 1 },
      });
      repository.resolveCreatorNames.mockResolvedValue(
        new Map([['u1', 'Ada Obi']]),
      );

      const result = await service.list(owner, {
        page: 1,
        limit: 20,
        expiring: 30,
        sort: 'expiry',
      });

      expect(repository.list).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ expiring: 30, sort: 'expiry' }),
      );
      expect(result.data[0]).toMatchObject({ createdByName: 'Ada Obi' });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the product is missing', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findOne(owner, 'x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('opens stock through the ledger, never by writing quantity', async () => {
      repository.findById.mockResolvedValue(product({ id: 'new-id' }));

      await service.create(owner, {
        name: 'Widget',
        sellingPrice: 10,
        costPrice: 5,
        quantity: 12,
        category: ['tools', 'hardware'],
      });

      expect(repository.ensureCategories).toHaveBeenCalledWith('b1', [
        'tools',
        'hardware',
      ]);
      const [, saved] = repository.saveItem.mock.calls[0] as [
        string,
        InventoryItem,
      ];
      expect(saved.quantity).toBe(0);
      expect(ledger.move).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ id: 'new-id' }),
        expect.objectContaining({
          delta: 12,
          reason: 'restock',
          actorUserId: 'u1',
          note: 'Opening stock',
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'product.created',
          after: expect.objectContaining({ quantity: 12 }) as unknown,
        }),
      );
    });

    it('records no movement for a product created with no stock', async () => {
      repository.findById.mockResolvedValue(product());
      await service.create(owner, {
        name: 'Widget',
        sellingPrice: 10,
        costPrice: 0,
        quantity: 0,
      });
      expect(ledger.move).not.toHaveBeenCalled();
    });

    it('refuses a barcode another product already has', async () => {
      repository.findByBarcode.mockResolvedValue(
        product({ id: 'other', name: 'Gadget' }),
      );
      await expect(
        service.create(owner, {
          name: 'Widget',
          sellingPrice: 10,
          costPrice: 0,
          quantity: 0,
          barcode: '123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.saveItem).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('audits a price edit with the before and after values', async () => {
      repository.findById.mockResolvedValue(product());

      await service.update(owner, 'i1', { sellingPrice: 12, costPrice: 6 });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'product.price_changed',
          entityId: 'i1',
          before: { costPrice: 5, sellingPrice: 10 },
          after: { costPrice: 6, sellingPrice: 12 },
        }),
      );
    });

    it('needs products.edit_price to change a price', async () => {
      await expect(
        service.update(stocker, 'i1', { sellingPrice: 1 }),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.saveItem).not.toHaveBeenCalled();
    });

    it('lets a restock-only member change the reorder point', async () => {
      repository.findById.mockResolvedValue(product());
      await service.update(stocker, 'i1', { reorderPoint: 5 });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'product.updated',
          before: { reorderPoint: 3 },
          after: { reorderPoint: 5 },
        }),
      );
    });

    it('replaces the categories and records nothing when nothing changed', async () => {
      repository.findById.mockResolvedValue(product());
      await service.update(owner, 'i1', { category: ['tools'] });
      expect(repository.ensureCategories).toHaveBeenCalledWith('b1', ['tools']);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the product is missing', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(owner, 'x', { name: 'A' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restock and adjust', () => {
    it('restocks through the ledger on the locked row and audits it', async () => {
      repository.lockById.mockResolvedValue(product());
      repository.findById.mockResolvedValue(product({ quantity: 15 }));

      await service.restock(stocker, 'i1', { quantity: 5, note: 'Delivery' });

      expect(ledger.move).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ id: 'i1' }),
        {
          delta: 5,
          reason: 'restock',
          note: 'Delivery',
          actorUserId: 'u2',
        },
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'product.stock_adjusted',
          before: { quantity: 10 },
          after: { quantity: 15, reason: 'restock', note: 'Delivery' },
        }),
      );
    });

    it('records an adjustment with its reason and warns when stock runs low', async () => {
      repository.lockById.mockResolvedValue(product());
      repository.findById.mockResolvedValue(product({ quantity: 2 }));

      await service.adjust(stocker, 'i1', { delta: -8, reason: 'Damaged' });

      expect(ledger.move).toHaveBeenCalledWith(
        'b1',
        expect.anything(),
        expect.objectContaining({
          delta: -8,
          reason: 'adjustment',
          note: 'Damaged',
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory.low-stock',
        expect.objectContaining({ businessId: 'b1' }),
      );
    });

    it('refuses to take stock below zero', async () => {
      repository.lockById.mockResolvedValue(product());
      await expect(
        service.adjust(stocker, 'i1', { delta: -11, reason: 'Count' }),
      ).rejects.toThrow(BadRequestException);
      expect(ledger.move).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('turns a ledger refusal into a 400', async () => {
      repository.lockById.mockResolvedValue(product());
      ledger.move.mockRejectedValue(new NegativeStockError('Widget'));
      await expect(
        service.adjust(stocker, 'i1', { delta: -1, reason: 'Count' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for a product of another business', async () => {
      repository.lockById.mockResolvedValue(null);
      await expect(
        service.restock(stocker, 'x', { quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('history', () => {
    it('lists movements with who made them', async () => {
      repository.findById.mockResolvedValue(product());
      ledger.history.mockResolvedValue([
        { id: 'm1', delta: 5, reason: 'restock', actorUserId: 'u2' },
        { id: 'm2', delta: -1, reason: 'sale', actorUserId: null },
      ]);
      repository.resolveCreatorNames.mockResolvedValue(
        new Map([['u2', 'Kemi Bello']]),
      );

      const rows = await service.history(owner, 'i1', 20);

      expect(ledger.history).toHaveBeenCalledWith('b1', 'i1', 20);
      expect(rows.map((r) => r.actorName)).toEqual(['Kemi Bello', undefined]);
    });

    it('throws NotFoundException when the product is missing', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.history(owner, 'x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes and audits the product as it was', async () => {
      repository.findById.mockResolvedValue(product());
      await expect(service.remove(owner, 'i1')).resolves.toEqual({
        message: 'Product deleted successfully',
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'product.deleted',
          before: expect.objectContaining({
            name: 'Widget',
            quantity: 10,
          }) as unknown,
        }),
      );
    });
  });

  describe('import', () => {
    const file = csv(
      [
        'name,sellingPrice,costPrice,quantity,sku,category',
        'Widget,12,6,25,W-1,tools',
        'Rice 5kg,9000,7000,10,R-5,"Food, Grains"',
        ',100,,,,',
        'Beans,abc,,,,',
        'Gari,500,,4,R-5,',
      ].join('\n'),
    );

    beforeEach(() => {
      repository.findAllForImport.mockResolvedValue([
        product({ sku: 'W-1', quantity: 10 }),
      ]);
    });

    it('previews row by row and writes nothing', async () => {
      const preview = await service.previewImport(owner, file);

      expect(preview.summary).toEqual({
        rows: 5,
        valid: 2,
        invalid: 3,
        creates: 1,
        updates: 1,
      });
      expect(preview.rows[0]).toMatchObject({
        row: 2,
        action: 'update',
        productId: 'i1',
        quantity: 25,
        stockChange: 15,
        errors: [],
      });
      expect(preview.rows[2].errors).toContain('name is required');
      expect(preview.rows[3].errors[0]).toMatch(/sellingPrice/);
      expect(preview.rows[4].errors).toContain('sku R-5 also appears on row 3');
      expect(repository.saveItem).not.toHaveBeenCalled();
      expect(ledger.move).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('applies the valid rows with import movements, skipping the rest', async () => {
      const result = await service.confirmImport(owner, file);

      expect(result.summary.valid).toBe(2);
      expect(repository.saveItem).toHaveBeenCalledTimes(2);
      expect(ledger.move).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ id: 'i1' }),
        expect.objectContaining({
          delta: 15,
          reason: 'import',
          note: 'Import from stock.csv',
        }),
      );
      expect(ledger.move).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ name: 'Rice 5kg' }),
        expect.objectContaining({ delta: 10, reason: 'import' }),
      );
      expect(repository.ensureCategories).toHaveBeenCalledWith('b1', [
        'Food',
        'Grains',
      ]);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'product.imported' }),
      );
    });

    it('leaves stock alone when a row has no quantity', async () => {
      await service.confirmImport(
        owner,
        csv('name,sellingPrice,sku\nWidget,15,W-1'),
      );
      expect(ledger.move).not.toHaveBeenCalled();
      expect(repository.saveItem).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ id: 'i1', sellingPrice: 15, quantity: 10 }),
      );
    });

    it('refuses a file where no row can be imported', async () => {
      await expect(
        service.confirmImport(owner, csv('name,sellingPrice\n,1')),
      ).rejects.toThrow(BadRequestException);
      expect(repository.saveItem).not.toHaveBeenCalled();
    });

    it('flags a barcode that belongs to another product', async () => {
      repository.findAllForImport.mockResolvedValue([
        product({ id: 'i9', name: 'Gadget', barcode: '555' }),
      ]);
      const preview = await service.previewImport(
        owner,
        csv('name,sellingPrice,sku,barcode\nNew thing,10,N-1,555'),
      );
      // Matched by barcode, so it is an update of Gadget, not a clash.
      expect(preview.rows[0]).toMatchObject({
        action: 'update',
        productId: 'i9',
      });

      repository.findAllForImport.mockResolvedValue([
        product({ id: 'i1', sku: 'W-1' }),
        product({ id: 'i9', name: 'Gadget', barcode: '555' }),
      ]);
      const clash = await service.previewImport(
        owner,
        csv('name,sellingPrice,sku,barcode\nWidget,10,W-1,555'),
      );
      expect(clash.rows[0].errors).toEqual([
        'barcode 555 is already used by Gadget',
      ]);
    });
  });
});
