import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TeamService } from './team.service';
import { TeamRepository } from './team.repository';
import { UsersRepository } from '../auth/users.repository';
import type { TeamMember } from '../entities/team-member.entity';
import type { User } from '../entities/user.entity';
import type { InviteMemberDto } from './dto/invite-member.dto';
import type { QueryTeamDto } from './dto/query-team.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('TeamService', () => {
  let service: TeamService;
  let teamRepository: {
    transaction: jest.Mock;
    createUser: jest.Mock;
    saveUser: jest.Mock;
    createMember: jest.Mock;
    saveMember: jest.Mock;
    list: jest.Mock;
    findByIdAndBusiness: jest.Mock;
    updateMember: jest.Mock;
    removeMember: jest.Mock;
    updatePermissions: jest.Mock;
  };
  let usersRepository: { findByEmail: jest.Mock };

  const ownerUser = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner',
    businessName: 'LUXA',
    businessId: 'b1',
  };

  beforeEach(() => {
    teamRepository = {
      transaction: jest.fn(),
      createUser: jest.fn(),
      saveUser: jest.fn(),
      createMember: jest.fn(),
      saveMember: jest.fn(),
      list: jest.fn(),
      findByIdAndBusiness: jest.fn(),
      updateMember: jest.fn(),
      removeMember: jest.fn(),
      updatePermissions: jest.fn(),
    };
    usersRepository = { findByEmail: jest.fn() };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-temp-password');

    service = new TeamService(
      teamRepository as unknown as TeamRepository,
      usersRepository as unknown as UsersRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('delegates to the repository with businessId and query filters', async () => {
      const result = { data: [], pagination: {} };
      teamRepository.list.mockResolvedValue(result);

      const query: QueryTeamDto = {
        page: 1,
        limit: 20,
        role: 'manager',
        status: 'active',
      };

      await expect(service.list(ownerUser, query)).resolves.toBe(result);
      expect(teamRepository.list).toHaveBeenCalledWith({
        businessId: 'b1',
        page: 1,
        limit: 20,
        role: 'manager',
        status: 'active',
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the member is missing', async () => {
      teamRepository.findByIdAndBusiness.mockResolvedValue(null);

      await expect(
        service.findOne(ownerUser, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the member for the business', async () => {
      const member = { id: 'm1' } as unknown as TeamMember;
      teamRepository.findByIdAndBusiness.mockResolvedValue(member);

      await expect(service.findOne(ownerUser, 'm1')).resolves.toBe(member);
      expect(teamRepository.findByIdAndBusiness).toHaveBeenCalledWith(
        'm1',
        'b1',
      );
    });
  });

  describe('inviteMember', () => {
    const dto: InviteMemberDto = {
      email: 'staff@luxa.com',
      name: 'Jane Doe',
      role: 'sales-assistant',
      permissions: ['view-products'],
      department: 'Sales',
    };

    it('throws BadRequestException when a user with the email already exists', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        id: 'existing',
      } as unknown as User);

      await expect(service.inviteMember(ownerUser, dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(teamRepository.transaction).not.toHaveBeenCalled();
    });

    it('creates a User and TeamMember atomically and returns the invitation', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      const newUser = {
        id: 'u2',
        email: 'staff@luxa.com',
      } as unknown as User;
      const newMember = {
        id: 'm1',
        name: 'Jane Doe',
        role: 'sales-assistant',
        status: 'invited',
      } as unknown as TeamMember;

      teamRepository.createUser.mockReturnValue(newUser);
      teamRepository.saveUser.mockResolvedValue(newUser);
      teamRepository.createMember.mockReturnValue(newMember);
      teamRepository.saveMember.mockResolvedValue(newMember);
      teamRepository.transaction.mockImplementation(
        async (fn: (manager: never) => Promise<unknown>) => fn({} as never),
      );

      const result = await service.inviteMember(ownerUser, dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 10);
      expect(teamRepository.createUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: 'staff@luxa.com',
          firstName: 'Jane',
          lastName: 'Doe',
          businessName: 'LUXA',
          businessId: 'b1',
          role: 'apprentice',
          staffRole: 'sales-assistant',
          status: 'invited',
        }),
      );
      expect(teamRepository.createMember).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          businessId: 'b1',
          userId: 'u2',
          name: 'Jane Doe',
          role: 'sales-assistant',
          permissions: ['view-products'],
          department: 'Sales',
          status: 'invited',
          joinedDate: expect.any(Date) as Date,
        }),
      );
      expect(result).toEqual({
        id: 'm1',
        email: 'staff@luxa.com',
        name: 'Jane Doe',
        role: 'sales-assistant',
        status: 'invited',
        message: 'Invitation sent to email',
      });
    });

    it('maps manager invitations to the manager user role', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      teamRepository.createUser.mockReturnValue({
        id: 'u2',
      } as unknown as User);
      teamRepository.saveUser.mockResolvedValue({
        id: 'u2',
      } as unknown as User);
      teamRepository.createMember.mockReturnValue({
        id: 'm1',
      } as unknown as TeamMember);
      teamRepository.saveMember.mockResolvedValue({
        id: 'm1',
      } as unknown as TeamMember);
      teamRepository.transaction.mockImplementation(
        async (fn: (manager: never) => Promise<unknown>) => fn({} as never),
      );

      await service.inviteMember(ownerUser, { ...dto, role: 'manager' });

      expect(teamRepository.createUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ role: 'manager', staffRole: 'manager' }),
      );
    });

    it('defaults permissions to an empty array when not provided', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      teamRepository.createUser.mockReturnValue({
        id: 'u2',
      } as unknown as User);
      teamRepository.saveUser.mockResolvedValue({
        id: 'u2',
      } as unknown as User);
      teamRepository.createMember.mockReturnValue({
        id: 'm1',
      } as unknown as TeamMember);
      teamRepository.saveMember.mockResolvedValue({
        id: 'm1',
      } as unknown as TeamMember);
      teamRepository.transaction.mockImplementation(
        async (fn: (manager: never) => Promise<unknown>) => fn({} as never),
      );

      await service.inviteMember(ownerUser, { ...dto, permissions: undefined });

      expect(teamRepository.createMember).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ permissions: [] }),
      );
    });
  });

  describe('updateMember', () => {
    it('throws NotFoundException when the member is missing', async () => {
      teamRepository.findByIdAndBusiness.mockResolvedValue(null);

      await expect(
        service.updateMember(ownerUser, 'missing', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates the provided fields and delegates to the repository', async () => {
      const member = { id: 'm1' } as unknown as TeamMember;
      const saved = {
        id: 'm1',
        role: 'manager',
        status: 'active',
      } as unknown as TeamMember;
      teamRepository.findByIdAndBusiness.mockResolvedValue(member);
      teamRepository.updateMember.mockResolvedValue(saved);

      const result = await service.updateMember(ownerUser, 'm1', {
        role: 'manager',
        status: 'active',
      });

      expect(teamRepository.updateMember).toHaveBeenCalledWith(member, {
        role: 'manager',
        status: 'active',
      });
      expect(result).toBe(saved);
    });

    it('omits undefined fields from the update data', async () => {
      const member = { id: 'm1' } as unknown as TeamMember;
      teamRepository.findByIdAndBusiness.mockResolvedValue(member);
      teamRepository.updateMember.mockResolvedValue(member);

      await service.updateMember(ownerUser, 'm1', { department: null });

      expect(teamRepository.updateMember).toHaveBeenCalledWith(member, {
        department: null,
      });
    });
  });

  describe('removeMember', () => {
    it('throws NotFoundException when the member is missing', async () => {
      teamRepository.findByIdAndBusiness.mockResolvedValue(null);

      await expect(
        service.removeMember(ownerUser, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes the member and returns a confirmation message', async () => {
      const member = { id: 'm1' } as unknown as TeamMember;
      teamRepository.findByIdAndBusiness.mockResolvedValue(member);
      teamRepository.removeMember.mockResolvedValue(undefined);

      await expect(service.removeMember(ownerUser, 'm1')).resolves.toEqual({
        message: 'Team member removed successfully',
      });
      expect(teamRepository.removeMember).toHaveBeenCalledWith(member);
    });
  });

  describe('updatePermissions', () => {
    it('throws NotFoundException when the member is missing', async () => {
      teamRepository.findByIdAndBusiness.mockResolvedValue(null);

      await expect(
        service.updatePermissions(ownerUser, 'missing', { permissions: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates the member permissions and returns the saved member', async () => {
      const member = { id: 'm1' } as unknown as TeamMember;
      const saved = {
        id: 'm1',
        permissions: ['view-products'],
      } as unknown as TeamMember;
      teamRepository.findByIdAndBusiness.mockResolvedValue(member);
      teamRepository.updatePermissions.mockResolvedValue(saved);

      const result = await service.updatePermissions(ownerUser, 'm1', {
        permissions: ['view-products'],
      });

      expect(teamRepository.updatePermissions).toHaveBeenCalledWith(member, [
        'view-products',
      ]);
      expect(result).toBe(saved);
    });
  });
});
