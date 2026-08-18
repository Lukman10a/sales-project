import { TeamRepository } from './team.repository';
import type { EntityManager } from 'typeorm';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';

describe('TeamRepository', () => {
  let repository: TeamRepository;
  let transactionFn: jest.Mock;
  let manager: EntityManager;

  const managerMock = {
    findOne: jest.fn(),
    create: jest.fn((_entity: unknown, data: unknown) => data),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
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
    it('createUser creates a User via the manager', () => {
      const user = { id: 'u1' } as User;
      managerMock.create.mockReturnValue(user);

      const data = {
        email: 'staff@luxa.com',
        password: 'hashed',
        firstName: 'Jane',
        lastName: 'Doe',
        businessName: 'LUXA',
        businessId: 'b1',
        role: 'apprentice' as const,
        staffRole: 'sales-assistant' as const,
        status: 'invited' as const,
      };

      const result = repository.createUser(manager, data);

      expect(managerMock.create).toHaveBeenCalledWith(User, data);
      expect(result).toBe(user);
    });

    it('saveUser saves a User through the manager', async () => {
      const user = { id: 'u1' } as User;
      managerMock.save.mockResolvedValue(user);

      await expect(repository.saveUser(manager, user)).resolves.toBe(user);
      expect(managerMock.save).toHaveBeenCalledWith(user);
    });

    it('createMember creates a TeamMember via the manager', () => {
      const member = { id: 'm1' } as TeamMember;
      managerMock.create.mockReturnValue(member);

      const data = {
        businessId: 'b1',
        userId: 'u1',
        name: 'Jane Doe',
        role: 'sales-assistant' as const,
        permissions: ['view-products'],
        department: 'Sales',
        status: 'invited' as const,
        joinedDate: new Date('2024-01-01'),
      };

      const result = repository.createMember(manager, data);

      expect(managerMock.create).toHaveBeenCalledWith(TeamMember, data);
      expect(result).toBe(member);
    });

    it('saveMember saves a TeamMember through the manager', async () => {
      const member = { id: 'm1' } as TeamMember;
      managerMock.save.mockResolvedValue(member);

      await expect(repository.saveMember(manager, member)).resolves.toBe(
        member,
      );
      expect(managerMock.save).toHaveBeenCalledWith(member);
    });
  });

  describe('list', () => {
    it('filters by businessId with pagination and applies role/status filters', async () => {
      const members = [{ id: 'm1' } as TeamMember];
      const getManyAndCount = jest.fn().mockResolvedValue([members, 1]);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      const result = await repository.list({
        businessId: 'b1',
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
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

      await repository.list({ businessId: 'b1', page: 1, limit: 20 });

      expect(qb.where).toHaveBeenCalledWith('team.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findByIdAndBusiness', () => {
    it('queries a member by id and businessId', async () => {
      const member = { id: 'm1', businessId: 'b1' } as TeamMember;
      const findOne = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(member);

      await expect(repository.findByIdAndBusiness('m1', 'b1')).resolves.toBe(
        member,
      );
      expect(findOne).toHaveBeenCalledWith({
        where: { id: 'm1', businessId: 'b1' },
      });
    });

    it('returns null when no member matches', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(
        repository.findByIdAndBusiness('missing', 'b1'),
      ).resolves.toBeNull();
    });
  });

  describe('updateMember', () => {
    it('applies the update data to the member and saves it', async () => {
      const member = {
        id: 'm1',
        role: 'sales-assistant',
        status: 'invited',
        department: 'Sales',
      } as TeamMember;
      const saved = {
        ...member,
        role: 'manager',
        status: 'active',
      } as TeamMember;
      managerMock.save.mockResolvedValue(saved);

      const result = await repository.updateMember(member, {
        role: 'manager',
        status: 'active',
      });

      expect(member.role).toBe('manager');
      expect(member.status).toBe('active');
      expect(managerMock.save).toHaveBeenCalledWith(member);
      expect(result).toBe(saved);
    });
  });

  describe('updatePermissions', () => {
    it('sets the permissions array and saves the member', async () => {
      const member = { id: 'm1' } as TeamMember;
      const saved = {
        ...member,
        permissions: ['view-products'],
      } as TeamMember;
      managerMock.save.mockResolvedValue(saved);

      const result = await repository.updatePermissions(member, [
        'view-products',
      ]);

      expect(member.permissions).toEqual(['view-products']);
      expect(managerMock.save).toHaveBeenCalledWith(member);
      expect(result).toBe(saved);
    });
  });

  describe('removeMember', () => {
    it('removes the member through the manager', async () => {
      const member = { id: 'm1' } as TeamMember;
      managerMock.remove.mockResolvedValue(member);

      await repository.removeMember(member);

      expect(managerMock.remove).toHaveBeenCalledWith(member);
    });
  });
});
