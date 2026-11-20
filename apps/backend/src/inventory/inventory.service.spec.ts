import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryService, calculateStatus } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
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
  });
});

describe('InventoryService', () => {
  let audit: { record: jest.Mock };
  let service: InventoryService;
  let repository: {
    list: jest.Mock;
    findById: jest.Mock;
    createItem: jest.Mock;
    saveItem: jest.Mock;
    removeItem: jest.Mock;
    decrementStock: jest.Mock;
    bulkUpsert: jest.Mock;
    resolveCreatorNames: jest.Mock;
    transaction: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };

  const user = {
    id: 'u1',
    businessId: 'b1',
    role: 'cashier' as const,
    permissions: ['products.edit_price' as const, 'products.restock' as const],
    maxDiscountPercent: 0,
  };
  const item = {
    id: 'i1',
    businessId: 'b1',
    createdBy: 'u1',
    name: 'Widget',
    category: ['tools'],
    wholesalePrice: 5,
    sellingPrice: 10,
    quantity: 10,
    reorderPoint: 3,
    status: 'in-stock',
  } as unknown as InventoryItem;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findById: jest.fn(),
      createItem: jest.fn(),
      saveItem: jest.fn(),
      removeItem: jest.fn(),
      decrementStock: jest.fn(),
      bulkUpsert: jest.fn(),
      resolveCreatorNames: jest.fn(),
      transaction: jest.fn(<T>(fn: () => Promise<T>) => fn()),
    };
    eventEmitter = { emit: jest.fn() };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    service = new InventoryService(
      repository as unknown as InventoryRepository,
      eventEmitter as unknown as EventEmitter2,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('delegates to the repository with businessId and query', async () => {
      const query = {
        page: 1,
        limit: 20,
        search: 'wid',
        category: 'tools',
        status: 'in-stock' as const,
        sort: 'name' as const,
      };
      repository.list.mockResolvedValue({
        data: [item],
        pagination: { total: 1 },
      });
      repository.resolveCreatorNames.mockResolvedValue(
        new Map([['u1', 'Ada Lovelace']]),
      );

      const result = await service.list(user, query);

      expect(repository.list).toHaveBeenCalledWith('b1', {
        page: 1,
        limit: 20,
        search: 'wid',
        category: 'tools',
        status: 'in-stock',
        sort: 'name',
      });
      expect(repository.resolveCreatorNames).toHaveBeenCalledWith('b1', ['u1']);
      expect(result.data).toEqual([{ ...item, createdByName: 'Ada Lovelace' }]);
    });

    it('leaves items untouched when the creator cannot be resolved', async () => {
      repository.list.mockResolvedValue({
        data: [item],
        pagination: { total: 1 },
      });
      repository.resolveCreatorNames.mockResolvedValue(new Map());

      const result = await service.list(user, {
        page: 1,
        limit: 20,
        sort: 'name',
      });

      expect(result.data[0]).toEqual({ ...item, createdByName: undefined });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when item is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(user, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the item enriched with the creator name', async () => {
      repository.findById.mockResolvedValue({ ...item });
      repository.resolveCreatorNames.mockResolvedValue(
        new Map([['u1', 'Ada Lovelace']]),
      );

      await expect(service.findOne(user, 'i1')).resolves.toEqual({
        ...item,
        createdByName: 'Ada Lovelace',
      });
      expect(repository.findById).toHaveBeenCalledWith('b1', 'i1');
    });
  });

  describe('create', () => {
    it('creates an item with auto-calculated status', async () => {
      const dto = {
        name: 'Widget',
        sellingPrice: 10,
        wholesalePrice: 5,
        quantity: 2,
        reorderPoint: 5,
      };
      repository.createItem.mockReturnValue({});
      repository.saveItem.mockImplementation((_b: string, e: InventoryItem) =>
        Promise.resolve({ ...e, id: 'i1' }),
      );

      const result = await service.create(user, dto);

      expect(repository.createItem).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({
          createdBy: 'u1',
          name: 'Widget',
          status: 'low-stock',
        }),
      );
      expect(repository.saveItem).toHaveBeenCalled();
      expect(result.id).toBe('i1');
    });

    it('persists image, lastRestocked, and confirmedByApprentice', async () => {
      const dto = {
        name: 'Widget',
        sellingPrice: 10,
        wholesalePrice: 5,
        quantity: 2,
        reorderPoint: 5,
        image: 'https://example.com/img.png',
        lastRestocked: new Date('2026-08-01'),
        confirmedByApprentice: true,
      };
      repository.createItem.mockReturnValue({});
      repository.saveItem.mockImplementation((_b: string, e: InventoryItem) =>
        Promise.resolve({ ...e, id: 'i1' }),
      );

      await service.create(user, dto);

      expect(repository.createItem).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({
          image: 'https://example.com/img.png',
          lastRestocked: dto.lastRestocked,
          confirmedByApprentice: true,
        }),
      );
      expect(repository.saveItem).toHaveBeenCalled();
    });

    it('auto-confirms an item created by the owner', async () => {
      const dto = {
        name: 'Widget',
        sellingPrice: 10,
        wholesalePrice: 5,
        quantity: 2,
      };
      repository.createItem.mockReturnValue({});
      repository.saveItem.mockImplementation((_b: string, e: InventoryItem) =>
        Promise.resolve({ ...e, id: 'i1' }),
      );

      await service.create(
        { id: 'owner1', businessId: 'b1', role: 'owner' },
        dto,
      );

      expect(repository.createItem).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({
          confirmedBy: 'owner1',
          confirmedAt: expect.any(Date) as Date,
          confirmedByApprentice: true,
        }),
      );
    });
  });

  describe('confirm', () => {
    it('throws NotFoundException when item is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.confirm(
          { id: 'u1', businessId: 'b1', role: 'owner' },
          'missing',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when the item is already confirmed', async () => {
      repository.findById.mockResolvedValue({
        ...item,
        confirmedBy: 'u2',
        confirmedAt: new Date(),
      });

      await expect(
        service.confirm({ id: 'u1', businessId: 'b1', role: 'owner' }, 'i1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.saveItem).not.toHaveBeenCalled();
    });

    it('confirms any item for an owner', async () => {
      repository.findById.mockResolvedValue({ ...item });
      repository.saveItem.mockImplementation((_b: string, e: InventoryItem) =>
        Promise.resolve(e),
      );

      const result = await service.confirm(
        { id: 'owner1', businessId: 'b1', role: 'owner' },
        'i1',
      );

      expect(repository.saveItem).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({
          confirmedBy: 'owner1',
          confirmedByApprentice: true,
        }),
      );
      expect(result.confirmedAt).toBeInstanceOf(Date);
    });

    it('lets a manager confirm an item created by someone else', async () => {
      repository.findById.mockResolvedValue({ ...item });
      repository.saveItem.mockImplementation((_b: string, e: InventoryItem) =>
        Promise.resolve(e),
      );

      const result = await service.confirm(
        { id: 'm1', businessId: 'b1', role: 'manager' },
        'i1',
      );

      expect(repository.saveItem).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ confirmedBy: 'm1' }),
      );
      expect(result.confirmedByApprentice).toBe(true);
    });

    it('blocks a manager from confirming their own entry', async () => {
      repository.findById.mockResolvedValue({ ...item });

      await expect(
        service.confirm({ id: 'u1', businessId: 'b1', role: 'manager' }, 'i1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.saveItem).not.toHaveBeenCalled();
    });

    it('lets an cashier confirm an item they created', async () => {
      repository.findById.mockResolvedValue({ ...item });
      repository.saveItem.mockImplementation((_b: string, e: InventoryItem) =>
        Promise.resolve(e),
      );

      const result = await service.confirm(
        { id: 'u1', businessId: 'b1', role: 'cashier' },
        'i1',
      );

      expect(repository.saveItem).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ confirmedBy: 'u1' }),
      );
      expect(result.confirmedByApprentice).toBe(true);
    });

    it('blocks an apprentice from confirming someone else item', async () => {
      repository.findById.mockResolvedValue({ ...item });

      await expect(
        service.confirm(
          { id: 'other', businessId: 'b1', role: 'cashier' },
          'i1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.saveItem).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when item is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(user, 'missing', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('updates fields and recalculates status', async () => {
      repository.findById.mockResolvedValue({ ...item });
      repository.saveItem.mockImplementation((_b: string, e: InventoryItem) =>
        Promise.resolve(e),
      );

      const result = await service.update(user, 'i1', {
        quantity: 1,
        reorderPoint: 5,
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
      expect(result.quantity).toBe(1);
      expect(result.status).toBe('low-stock');
      expect(repository.saveItem).toHaveBeenCalled();
    });

    it('persists image, lastRestocked, confirmedByApprentice and recalculates status', async () => {
      repository.findById.mockResolvedValue({ ...item });
      repository.saveItem.mockImplementation((_b: string, e: InventoryItem) =>
        Promise.resolve(e),
      );

      const result = await service.update(user, 'i1', {
        image: 'https://example.com/new.png',
        lastRestocked: new Date('2026-08-10'),
        confirmedByApprentice: true,
        quantity: 2,
      });

      expect(result.image).toBe('https://example.com/new.png');
      expect(result.lastRestocked).toEqual(new Date('2026-08-10'));
      expect(result.confirmedByApprentice).toBe(true);
      expect(result.status).toBe('low-stock');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when item is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(user, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes the item and returns a confirmation', async () => {
      repository.findById.mockResolvedValue({ ...item });

      const result = await service.remove(user, 'i1');

      expect(repository.removeItem).toHaveBeenCalledWith('b1', item);
      expect(result).toEqual({ message: 'Product deleted successfully' });
    });
  });

  describe('decrement', () => {
    it('throws NotFoundException when item is missing', async () => {
      repository.decrementStock.mockResolvedValue({
        item: null,
        decremented: false,
      });

      await expect(
        service.decrement(user, 'missing', { quantity: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when stock is insufficient', async () => {
      repository.decrementStock.mockResolvedValue({
        item: { ...item, quantity: 1, status: 'in-stock' },
        decremented: false,
      });

      await expect(
        service.decrement(user, 'i1', { quantity: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('emits low-stock when the item drops to low-stock', async () => {
      const lowItem = { ...item, quantity: 8, status: 'low-stock' };
      repository.decrementStock.mockResolvedValue({
        item: lowItem,
        decremented: true,
      });

      const result = await service.decrement(user, 'i1', { quantity: 8 });

      expect(eventEmitter.emit).toHaveBeenCalledWith('inventory.low-stock', {
        businessId: 'b1',
        item: lowItem,
      });
      expect(result).toBe(lowItem);
    });

    it('does not emit when stock remains healthy', async () => {
      repository.decrementStock.mockResolvedValue({
        item: { ...item, quantity: 8, status: 'in-stock' },
        decremented: true,
      });

      await service.decrement(user, 'i1', { quantity: 2 });

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('records one stock adjustment with the before and after quantity', async () => {
      repository.decrementStock.mockResolvedValue({
        item: { ...item, quantity: 8, status: 'in-stock' },
        decremented: true,
      });

      await service.decrement(user, 'i1', { quantity: 2 });

      expect(repository.transaction).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect((audit.record.mock.lastCall as unknown[])[0]).toMatchObject({
        businessId: 'b1',
        action: 'product.stock_adjusted',
        entityId: 'i1',
        before: { quantity: 10 },
        after: { quantity: 8 },
      });
    });
  });

  describe('audit trail', () => {
    const lastEvent = () =>
      (audit.record.mock.lastCall as unknown[])[0] as Record<string, unknown>;

    beforeEach(() => {
      repository.saveItem.mockImplementation((_b: string, i: InventoryItem) =>
        Promise.resolve(i),
      );
    });

    it('records a creation', async () => {
      repository.createItem.mockImplementation(
        (_b: string, d: Partial<InventoryItem>) => ({ id: 'new', ...d }),
      );
      await service.create(
        { id: 'u1', businessId: 'b1', role: 'owner' },
        { name: 'Rice', wholesalePrice: 5, sellingPrice: 10, quantity: 3 },
      );
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(lastEvent()).toMatchObject({
        action: 'product.created',
        entityId: 'new',
        after: { name: 'Rice', quantity: 3 },
      });
    });

    it.each([
      [{ sellingPrice: 12 }, 'product.price_changed'],
      [{ quantity: 4 }, 'product.stock_adjusted'],
      [{ name: 'Brown rice' }, 'product.updated'],
    ] as const)('classifies %o as %s', async (dto, action) => {
      repository.findById.mockResolvedValue({ ...item });
      await service.update(
        { ...user, role: 'owner', permissions: [], maxDiscountPercent: 100 },
        'i1',
        dto,
      );
      expect(audit.record).toHaveBeenCalledTimes(1);
      const key = Object.keys(dto)[0];
      expect(lastEvent()).toMatchObject({
        action,
        before: { [key]: (item as never)[key] },
        after: dto,
      });
    });

    it('records a confirmation', async () => {
      repository.findById.mockResolvedValue({
        ...item,
        createdBy: 'u2',
        confirmedBy: undefined,
      });
      await service.confirm(
        { id: 'u1', businessId: 'b1', role: 'owner' },
        'i1',
      );
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(lastEvent()).toMatchObject({ action: 'product.confirmed' });
    });

    it('records a deletion with the product as it was', async () => {
      repository.findById.mockResolvedValue({ ...item });
      await service.remove(user, 'i1');
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(lastEvent()).toMatchObject({
        action: 'product.deleted',
        entityId: 'i1',
        before: { name: item.name },
      });
    });

    it('records nothing when the change fails', async () => {
      repository.findById.mockResolvedValue({ ...item });
      repository.removeItem.mockRejectedValue(new Error('db down'));
      await expect(service.remove(user, 'i1')).rejects.toThrow('db down');
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('bulkImport', () => {
    it('imports valid JSON rows', async () => {
      repository.bulkUpsert.mockResolvedValue(2);

      const result = await service.bulkImport(user, {
        buffer: Buffer.from(
          JSON.stringify([
            { name: 'A', sellingPrice: '10', quantity: '2' },
            { name: 'B', sellingPrice: '20', quantity: '5' },
          ]),
        ),
        mimetype: 'application/json',
      });

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(repository.bulkUpsert).toHaveBeenCalledWith(
        'b1',
        expect.arrayContaining([
          expect.objectContaining({ name: 'A', status: 'in-stock' }),
          expect.objectContaining({ name: 'B', status: 'in-stock' }),
        ]),
        'u1',
      );
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect((audit.record.mock.lastCall as unknown[])[0]).toMatchObject({
        action: 'product.imported',
        after: { imported: 2, skipped: 0, names: ['A', 'B'] },
      });
    });

    it('parses CSV rows', async () => {
      repository.bulkUpsert.mockResolvedValue(1);

      const csv = 'name,sku,sellingPrice,quantity,reorderPoint\nC,SKU1,15,4,5';
      const result = await service.bulkImport(user, {
        buffer: Buffer.from(csv),
        mimetype: 'text/csv',
      });

      expect(result.imported).toBe(1);
      expect(repository.bulkUpsert).toHaveBeenCalledWith(
        'b1',
        [
          expect.objectContaining({
            name: 'C',
            sku: 'SKU1',
            status: 'low-stock',
          }),
        ],
        'u1',
      );
    });

    it('skips invalid rows and reports errors', async () => {
      repository.bulkUpsert.mockResolvedValue(1);

      const result = await service.bulkImport(user, {
        buffer: Buffer.from(
          JSON.stringify([
            { name: 'A', sellingPrice: '10' },
            { sellingPrice: '20' },
          ]),
        ),
        mimetype: 'application/json',
      });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors.length).toBe(1);
    });

    it('throws when there are no valid rows', async () => {
      await expect(
        service.bulkImport(user, {
          buffer: Buffer.from(JSON.stringify([{ sellingPrice: '20' }])),
          mimetype: 'application/json',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws on empty file', async () => {
      await expect(
        service.bulkImport(user, { buffer: Buffer.from(''), mimetype: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
