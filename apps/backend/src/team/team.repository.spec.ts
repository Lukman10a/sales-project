import { TeamRepository } from './team.repository';
import type { EntityManager } from 'typeorm';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { TenantMismatchError } from '../common/tenancy/assert-tenant';

describe('TeamRepository', () => {
  let repository: TeamRepository;
  let transactionFn: jest.Mock;
  let manager: EntityManager;

  const managerMock = {
    findOne: jest.fn(),
    create: jest.fn((_entity: unknown, data: unknown) => data),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    remove: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    transactionFn = jest.fn();
    manager = managerMock as unknown as EntityManager;
    repository = new TeamRepository({
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

  describe('manager helpers', () => {
    it('createUser stamps the business on the new login', () => {
      const data = {
        email: 'staff@luxa.com',
        password: 'hashed',
        firstName: 'Jane',
        lastName: 'Doe',
        businessName: 'LUXA',
        role: 'cashier' as const,
        status: 'invited' as const,
      };

      repository.createUser('b1', manager, data);

      expect(managerMock.create).toHaveBeenCalledWith(User, {
        ...data,
        businessId: 'b1',
      });
    });

    it('createMember stamps the business on the member row', () => {
      const data = {
        userId: 'u1',
        name: 'Jane Doe',
        role: 'cashier' as const,
        permissions: ['sales.record'],
        maxDiscountPercent: 0,
        status: 'invited' as const,
        joinedDate: new Date('2026-01-01'),
      };

      repository.createMember('b1', manager, data);

      expect(managerMock.create).toHaveBeenCalledWith(TeamMember, {
        ...data,
        businessId: 'b1',
      });
    });

    it('saves users and members of the same business only', async () => {
      const user = { id: 'u1', businessId: 'b1' } as User;
      const member = { id: 'm1', businessId: 'b1' } as TeamMember;
      await repository.saveUser('b1', manager, user);
      await repository.saveMember('b1', manager, member);
      expect(managerMock.save).toHaveBeenCalledTimes(2);

      expect(() => repository.saveUser('b2', manager, user)).toThrow(
        TenantMismatchError,
      );
      expect(() => repository.saveMember('b2', manager, member)).toThrow(
        TenantMismatchError,
      );
      expect(managerMock.save).toHaveBeenCalledTimes(2);
    });

    it('updateUser only touches a login inside the business', async () => {
      await repository.updateUser('b1', 'u1', { role: 'manager' });
      expect(managerMock.update).toHaveBeenCalledWith(
        User,
        { id: 'u1', businessId: 'b1' },
        { role: 'manager' },
      );
    });
  });

  describe('list', () => {
    it('filters by businessId with pagination and applies role/status filters', async () => {
      const members = [{ id: 'm1' } as TeamMember];
      const getManyAndCount = jest.fn().mockResolvedValue([members, 1]);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      const result = await repository.list('b1', {
        page: 1,
        limit: 20,
        role: 'manager',
        status: 'active',
      });

      expect(qb.where).toHaveBeenCalledWith('team.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('team.role = :role', {
        role: 'manager',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('team.status = :status', {
        status: 'active',
      });
      expect(qb.orderBy).toHaveBeenCalledWith('team.createdAt', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(result.data).toEqual(members);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it('omits role and status filters when not provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      await repository.list('b1', { page: 1, limit: 20 });

      expect(qb.where).toHaveBeenCalledWith('team.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('joins the user email and surfaces it on each member', async () => {
      const members = [
        {
          id: 'm1',
          name: 'Jane Doe',
          user: { id: 'u1', email: 'jane@luxa.com' },
        } as unknown as TeamMember,
      ];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([members, 1]),
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      const result = await repository.list('b1', {
        page: 1,
        limit: 20,
      });

      expect(qb.leftJoin).toHaveBeenCalledWith('team.user', 'user');
      expect(qb.addSelect).toHaveBeenCalledWith('user.email');
      expect(result.data[0]).toMatchObject({
        id: 'm1',
        name: 'Jane Doe',
        email: 'jane@luxa.com',
      });
      expect(result.data[0]).not.toHaveProperty('user');
    });
  });

  describe('findById', () => {
    it('queries a member by id within the business', async () => {
      const member = { id: 'm1', businessId: 'b1' } as TeamMember;
      const findOne = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(member);

      await expect(repository.findById('b1', 'm1')).resolves.toBe(member);
      expect(findOne).toHaveBeenCalledWith({
        where: { id: 'm1', businessId: 'b1' },
      });
    });
  });

  describe('updateMember', () => {
    it('applies the update data to the member and saves it', async () => {
      const member = {
        id: 'm1',
        businessId: 'b1',
        role: 'cashier',
      } as TeamMember;

      const result = await repository.updateMember('b1', member, {
        role: 'manager',
        permissions: ['sales.record', 'sales.refund'],
        maxDiscountPercent: 10,
      });

      expect(result).toMatchObject({
        role: 'manager',
        permissions: ['sales.record', 'sales.refund'],
        maxDiscountPercent: 10,
      });
      expect(managerMock.save).toHaveBeenCalledWith(member);
    });

    it("refuses another business's member", async () => {
      const member = { id: 'm1', businessId: 'b2' } as TeamMember;
      await expect(
        repository.updateMember('b1', member, { role: 'manager' }),
      ).rejects.toThrow(TenantMismatchError);
      expect(member.role).toBeUndefined();
    });
  });

  describe('removeMember', () => {
    it('removes a member of the business', async () => {
      const member = { id: 'm1', businessId: 'b1' } as TeamMember;
      await repository.removeMember('b1', member);
      expect(managerMock.remove).toHaveBeenCalledWith(member);
    });

    it("refuses another business's member", async () => {
      const member = { id: 'm1', businessId: 'b2' } as TeamMember;
      await expect(repository.removeMember('b1', member)).rejects.toThrow(
        TenantMismatchError,
      );
      expect(managerMock.remove).not.toHaveBeenCalled();
    });
  });
});
