import { InventoryRepository } from './inventory.repository';
import { InventoryItem } from '../entities/inventory-item.entity';

describe('InventoryRepository', () => {
  let repository: InventoryRepository;
  let transactionFn: jest.Mock;

  beforeEach(() => {
    transactionFn = jest.fn();
    repository = new InventoryRepository({
      createEntityManager: jest.fn(),
      transaction: transactionFn,
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findByIdAndBusiness', () => {
    it('queries by id and businessId', async () => {
      const item = { id: 'i1', businessId: 'b1' } as InventoryItem;
      const findOne = jest.spyOn(repository, 'findOne').mockResolvedValue(item);

      await expect(repository.findByIdAndBusiness('i1', 'b1')).resolves.toBe(
        item,
      );
      expect(findOne).toHaveBeenCalledWith({
        where: { id: 'i1', businessId: 'b1' },
      });
    });

    it('returns null when no item matches', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(
        repository.findByIdAndBusiness('missing', 'b1'),
      ).resolves.toBeNull();
    });
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

  describe('decrementStock', () => {
    it('runs the atomic decrement then reloads the item', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      const reloaded = { id: 'i1', quantity: 5, status: 'in-stock' } as never;
      const findOne = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(reloaded);

      const result = await repository.decrementStock('i1', 'b1', 2);

      expect(qb.update).toHaveBeenCalledWith(InventoryItem);
      expect(qb.set).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith(
        'id = :id AND businessId = :businessId AND quantity >= :qty',
        { id: 'i1', businessId: 'b1', qty: 2 },
      );
      expect(qb.execute).toHaveBeenCalled();
      expect(findOne).toHaveBeenCalledWith({
        where: { id: 'i1', businessId: 'b1' },
      });
      expect(result).toBe(reloaded);
    });
  });

  describe('bulkUpsert', () => {
    it('inserts rows with businessId/createdBy and returns count', async () => {
      const qb = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      const count = await repository.bulkUpsert(
        [
          {
            name: 'A',
            category: ['x'],
            wholesalePrice: 1,
            sellingPrice: 2,
            quantity: 3,
            status: 'in-stock',
          },
        ],
        'b1',
        'u1',
      );

      expect(qb.into).toHaveBeenCalledWith(InventoryItem);
      expect(qb.values).toHaveBeenCalledWith([
        {
          name: 'A',
          category: ['x'],
          wholesalePrice: 1,
          sellingPrice: 2,
          quantity: 3,
          status: 'in-stock',
          businessId: 'b1',
          createdBy: 'u1',
        },
      ]);
      expect(qb.orUpdate).toHaveBeenCalled();
      expect(count).toBe(1);
    });
  });
});
