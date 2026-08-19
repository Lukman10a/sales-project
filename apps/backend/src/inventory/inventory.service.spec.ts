import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryService, calculateStatus } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
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
  let service: InventoryService;
  let repository: {
    list: jest.Mock;
    findByIdAndBusiness: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    decrementStock: jest.Mock;
    bulkUpsert: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };

  const user = { id: 'u1', businessId: 'b1' };
  const item = {
    id: 'i1',
    businessId: 'b1',
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
      findByIdAndBusiness: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      decrementStock: jest.fn(),
      bulkUpsert: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };

    service = new InventoryService(
      repository as unknown as InventoryRepository,
      eventEmitter as unknown as EventEmitter2,
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

      const result = await service.list(user, query);

      expect(repository.list).toHaveBeenCalledWith({
        businessId: 'b1',
        page: 1,
        limit: 20,
        search: 'wid',
        category: 'tools',
        status: 'in-stock',
        sort: 'name',
      });
      expect(result.data).toEqual([item]);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when item is missing', async () => {
      repository.findByIdAndBusiness.mockResolvedValue(null);

      await expect(service.findOne(user, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the item for the business', async () => {
      repository.findByIdAndBusiness.mockResolvedValue(item);

      await expect(service.findOne(user, 'i1')).resolves.toBe(item);
      expect(repository.findByIdAndBusiness).toHaveBeenCalledWith('i1', 'b1');
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
      repository.create.mockReturnValue({});
      repository.save.mockImplementation((e: InventoryItem) =>
        Promise.resolve({ ...e, id: 'i1' }),
      );

      const result = await service.create(user, dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'b1',
          createdBy: 'u1',
          name: 'Widget',
          status: 'low-stock',
        }),
      );
      expect(repository.save).toHaveBeenCalled();
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
      repository.create.mockReturnValue({});
      repository.save.mockImplementation((e: InventoryItem) =>
        Promise.resolve({ ...e, id: 'i1' }),
      );

      await service.create(user, dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'https://example.com/img.png',
          lastRestocked: dto.lastRestocked,
          confirmedByApprentice: true,
        }),
      );
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when item is missing', async () => {
      repository.findByIdAndBusiness.mockResolvedValue(null);

      await expect(service.update(user, 'missing', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('updates fields and recalculates status', async () => {
      repository.findByIdAndBusiness.mockResolvedValue(item);
      repository.save.mockImplementation((e: InventoryItem) =>
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
      expect(repository.save).toHaveBeenCalled();
    });

    it('persists image, lastRestocked, confirmedByApprentice and recalculates status', async () => {
      repository.findByIdAndBusiness.mockResolvedValue(item);
      repository.save.mockImplementation((e: InventoryItem) =>
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
      repository.findByIdAndBusiness.mockResolvedValue(null);

      await expect(service.remove(user, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes the item and returns a confirmation', async () => {
      repository.findByIdAndBusiness.mockResolvedValue(item);

      const result = await service.remove(user, 'i1');

      expect(repository.remove).toHaveBeenCalledWith(item);
      expect(result).toEqual({ message: 'Product deleted successfully' });
    });
  });

  describe('decrement', () => {
    it('throws NotFoundException when item is missing', async () => {
      repository.decrementStock.mockResolvedValue(null);

      await expect(
        service.decrement(user, 'missing', { quantity: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when stock is insufficient', async () => {
      repository.decrementStock.mockResolvedValue({
        ...item,
        quantity: 1,
        status: 'in-stock',
      });

      await expect(
        service.decrement(user, 'i1', { quantity: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('emits low-stock when the item drops to low-stock', async () => {
      const lowItem = { ...item, quantity: 8, status: 'low-stock' };
      repository.decrementStock.mockResolvedValue(lowItem);

      const result = await service.decrement(user, 'i1', { quantity: 8 });

      expect(eventEmitter.emit).toHaveBeenCalledWith('inventory.low-stock', {
        businessId: 'b1',
        item: lowItem,
      });
      expect(result).toBe(lowItem);
    });

    it('does not emit when stock remains healthy', async () => {
      repository.decrementStock.mockResolvedValue({
        ...item,
        quantity: 8,
        status: 'in-stock',
      });

      await service.decrement(user, 'i1', { quantity: 2 });

      expect(eventEmitter.emit).not.toHaveBeenCalled();
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
        expect.arrayContaining([
          expect.objectContaining({ name: 'A', status: 'in-stock' }),
          expect.objectContaining({ name: 'B', status: 'in-stock' }),
        ]),
        'b1',
        'u1',
      );
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
        [
          expect.objectContaining({
            name: 'C',
            sku: 'SKU1',
            status: 'low-stock',
          }),
        ],
        'b1',
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
