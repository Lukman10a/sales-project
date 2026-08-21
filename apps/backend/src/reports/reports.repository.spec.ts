import { In, type EntityManager, type Repository } from 'typeorm';
import { ReportsRepository } from './reports.repository';
import { Report } from '../entities/report.entity';
import { User } from '../entities/user.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';

describe('ReportsRepository', () => {
  let repository: ReportsRepository;
  let reportRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
    manager: EntityManager;
  };
  let userRepo: { find: jest.Mock };
  let managerMock: { createQueryBuilder: jest.Mock };

  beforeEach(() => {
    managerMock = { createQueryBuilder: jest.fn() };
    reportRepo = {
      create: jest.fn((entity: Partial<Report>) => entity),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: managerMock as unknown as EntityManager,
    };
    userRepo = { find: jest.fn() };

    repository = new ReportsRepository(
      reportRepo as unknown as Repository<Report>,
      userRepo as unknown as Repository<User>,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('creates and saves the report through the repository', async () => {
      const entity = {
        businessId: 'b1',
        name: 'August Sales',
      } as Partial<Report>;
      reportRepo.save.mockResolvedValue({ ...entity, id: 'r1' });

      const result = await repository.create(entity);

      expect(reportRepo.create).toHaveBeenCalledWith(entity);
      expect(reportRepo.save).toHaveBeenCalled();
      expect(result).toEqual({ ...entity, id: 'r1' });
    });
  });

  describe('list', () => {
    it('paginates reports for the business ordered by createdAt DESC', async () => {
      const reports = [{ id: 'r1' } as Report];
      const getManyAndCount = jest.fn().mockResolvedValue([reports, 1]);
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      reportRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await repository.list('b1', 1, 20);

      expect(reportRepo.createQueryBuilder).toHaveBeenCalledWith('report');
      expect(qb.where).toHaveBeenCalledWith('report.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(qb.orderBy).toHaveBeenCalledWith('report.createdAt', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({ data: reports, total: 1, page: 1, limit: 20 });
    });
  });

  describe('findById', () => {
    it('queries a report by id and businessId', async () => {
      const report = { id: 'r1', businessId: 'b1' } as Report;
      reportRepo.findOne.mockResolvedValue(report);

      await expect(repository.findById('b1', 'r1')).resolves.toBe(report);
      expect(reportRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'r1', businessId: 'b1' },
      });
    });

    it('returns null when no report matches', async () => {
      reportRepo.findOne.mockResolvedValue(null);

      await expect(repository.findById('b1', 'missing')).resolves.toBeNull();
    });
  });

  describe('remove', () => {
    it('removes the report through the repository', async () => {
      const report = { id: 'r1' } as Report;
      reportRepo.remove.mockResolvedValue(report);

      await repository.remove(report);

      expect(reportRepo.remove).toHaveBeenCalledWith(report);
    });
  });

  describe('resolveCreatorNames', () => {
    it('maps user ids to full names without loading full user rows', async () => {
      const users = [
        { id: 'u1', firstName: 'Ada', lastName: 'Lovelace' },
        { id: 'u2', firstName: 'Grace', lastName: 'Hopper' },
      ];
      userRepo.find.mockResolvedValue(users);

      const result = await repository.resolveCreatorNames(['u1', 'u2']);

      expect(userRepo.find).toHaveBeenCalledWith({
        where: { id: In(['u1', 'u2']) },
        select: ['id', 'firstName', 'lastName'],
      });
      expect(result.get('u1')).toBe('Ada Lovelace');
      expect(result.get('u2')).toBe('Grace Hopper');
    });

    it('returns an empty map for an empty id list', async () => {
      userRepo.find.mockClear();
      const result = await repository.resolveCreatorNames([]);

      expect(userRepo.find).not.toHaveBeenCalled();
      expect(result.size).toBe(0);
    });
  });

  describe('profitSummary', () => {
    it('aggregates revenue, orders and net profit from completed sales', async () => {
      const getRawOne = jest
        .fn()
        .mockResolvedValue({ revenue: '100', orders: '2', netProfit: '40' });
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne,
      };
      managerMock.createQueryBuilder.mockReturnValue(qb);

      const result = await repository.profitSummary(
        'b1',
        '2026-08-01',
        '2026-08-20',
      );

      expect(managerMock.createQueryBuilder).toHaveBeenCalledWith(Sale, 's');
      expect(qb.innerJoin).toHaveBeenCalledWith(
        SaleItem,
        'si',
        'si.saleId = s.id',
      );
      expect(qb.leftJoin).toHaveBeenCalledWith(
        InventoryItem,
        'ii',
        'ii.id = si.productId AND ii.businessId = :businessId',
        { businessId: 'b1' },
      );
      expect(qb.where).toHaveBeenCalledWith('s.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        's.createdAt BETWEEN :from AND :to',
        {
          from: expect.any(Date) as Date,
          to: expect.any(Date) as Date,
        },
      );
      expect(result).toEqual({ revenue: 100, orders: 2, netProfit: 40 });
    });

    it('returns zeros when there is no matching data', async () => {
      const getRawOne = jest.fn().mockResolvedValue(null);
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne,
      };
      managerMock.createQueryBuilder.mockReturnValue(qb);

      const result = await repository.profitSummary(
        'b1',
        '2026-08-01',
        '2026-08-20',
      );

      expect(result).toEqual({ revenue: 0, orders: 0, netProfit: 0 });
    });
  });
});
