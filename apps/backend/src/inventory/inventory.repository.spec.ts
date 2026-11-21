import { In } from 'typeorm';
import { InventoryRepository } from './inventory.repository';
import { InventoryItem } from '../entities/inventory-item.entity';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';

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

  describe('findById', () => {
    it('queries by id and businessId', async () => {
      const item = { id: 'i1', businessId: 'b1' } as InventoryItem;
      const findOne = jest.spyOn(repository, 'findOne').mockResolvedValue(item);

      await expect(repository.findById('b1', 'i1')).resolves.toBe(item);
      expect(findOne).toHaveBeenCalledWith({
        where: { id: 'i1', businessId: 'b1' },
        relations: ['categories'],
      });
    });

    it('returns null when no item matches', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(repository.findById('b1', 'missing')).resolves.toBeNull();
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

  describe('lockById', () => {
    it('locks the business row for update', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      await expect(repository.lockById('b1', 'i1')).resolves.toBeNull();
      expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(qb.where).toHaveBeenCalledWith(
        'item.id = :id AND item.businessId = :businessId',
        { id: 'i1', businessId: 'b1' },
      );
    });
  });

  describe('findByBarcode', () => {
    it('looks the barcode up within the business', async () => {
      const findOne = jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      await repository.findByBarcode('b1', '123');
      expect(findOne).toHaveBeenCalledWith({
        where: { businessId: 'b1', barcode: '123' },
      });
    });
  });

  describe('ensureCategories', () => {
    it('inserts missing names once, trimmed, and returns them all', async () => {
      const qb = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };
      const rows = [{ id: 'c1', name: 'Food' }];
      const manager = {
        createQueryBuilder: jest.fn(() => qb),
        find: jest.fn().mockResolvedValue(rows),
      };
      const repo = new InventoryRepository({
        createEntityManager: () => manager,
        transaction: transactionFn,
      } as never);

      await expect(
        repo.ensureCategories('b1', [' Food', 'Food', '']),
      ).resolves.toBe(rows);
      expect(qb.into).toHaveBeenCalledWith(Category);
      expect(qb.values).toHaveBeenCalledWith([
        { businessId: 'b1', name: 'Food' },
      ]);
      expect(qb.orIgnore).toHaveBeenCalled();
      expect(manager.find).toHaveBeenCalledWith(Category, {
        where: { businessId: 'b1', name: In(['Food']) },
      });
    });

    it('does nothing for no names', async () => {
      await expect(repository.ensureCategories('b1', [' '])).resolves.toEqual(
        [],
      );
    });
  });

  describe('resolveCreatorNames', () => {
    it('maps user ids to full names without loading full user rows', async () => {
      const users = [
        { id: 'u1', firstName: 'Ada', lastName: 'Lovelace' },
        { id: 'u2', firstName: 'Grace', lastName: 'Hopper' },
      ];
      const manager = { find: jest.fn().mockResolvedValue(users) };
      const repo = new InventoryRepository({
        createEntityManager: () => manager,
        transaction: transactionFn,
      } as never);

      const result = await repo.resolveCreatorNames('b1', ['u1', 'u2']);

      expect(manager.find).toHaveBeenCalledWith(User, {
        where: { id: In(['u1', 'u2']), businessId: 'b1' },
        select: ['id', 'firstName', 'lastName'],
      });
      expect(result.get('u1')).toBe('Ada Lovelace');
      expect(result.get('u2')).toBe('Grace Hopper');
    });

    it('returns an empty map for an empty id list', async () => {
      const manager = { find: jest.fn() };
      const repo = new InventoryRepository({
        createEntityManager: () => manager,
        transaction: transactionFn,
      } as never);

      const result = await repo.resolveCreatorNames('b1', []);

      expect(manager.find).not.toHaveBeenCalled();
      expect(result.size).toBe(0);
    });
  });
});
