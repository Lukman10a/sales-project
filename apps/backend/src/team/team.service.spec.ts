import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TeamService } from './team.service';
import { TeamRepository } from './team.repository';
import { UsersRepository } from '../auth/users.repository';
import type { PrincipalService } from '../auth/principal.service';
import type { TeamMember } from '../entities/team-member.entity';
import type { InviteMemberDto } from './dto/invite-member.dto';
import type { QueryTeamDto } from './dto/query-team.dto';
import { PERMISSIONS } from '../common/constants/permissions';
import type { AuditService } from '../audit/audit.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('TeamService', () => {
  let audit: { record: jest.Mock };
  let service: TeamService;
  let teamRepository: {
    transaction: jest.Mock;
    createUser: jest.Mock;
    saveUser: jest.Mock;
    createMember: jest.Mock;
    saveMember: jest.Mock;
    list: jest.Mock;
    findById: jest.Mock;
    updateMember: jest.Mock;
    updateUser: jest.Mock;
    removeMember: jest.Mock;
  };
  let usersRepository: { findByEmail: jest.Mock };
  let principals: { invalidate: jest.Mock };

  const owner = {
    id: 'u1',
    role: 'owner' as const,
    businessName: 'LUXA',
    businessId: 'b1',
    permissions: [...PERMISSIONS],
    maxDiscountPercent: 100,
  };
  const manager = {
    ...owner,
    id: 'u9',
    role: 'manager' as const,
    permissions: [
      'sales.record' as const,
      'sales.discount' as const,
      'sales.refund' as const,
      'products.restock' as const,
      'staff.manage' as const,
    ],
    maxDiscountPercent: 10,
  };
  const member = () =>
    ({
      id: 'm1',
      businessId: 'b1',
      userId: 'u2',
      name: 'Jane Doe',
      role: 'cashier',
      permissions: ['sales.record'],
      maxDiscountPercent: 0,
      status: 'active',
    }) as unknown as TeamMember;

  const dto: InviteMemberDto = {
    email: 'staff@luxa.com',
    name: 'Jane Doe',
    role: 'cashier',
  };

  beforeEach(() => {
    teamRepository = {
      transaction: jest.fn(async (fn: (m: never) => Promise<unknown>) =>
        fn({} as never),
      ),
      createUser: jest.fn(
        (_b: string, _m: never, data: Record<string, unknown>) => ({
          id: 'u2',
          ...data,
        }),
      ),
      saveUser: jest.fn((_b: string, _m: never, u: unknown) =>
        Promise.resolve(u),
      ),
      createMember: jest.fn(
        (_b: string, _m: never, data: Record<string, unknown>) => ({
          id: 'm1',
          ...data,
        }),
      ),
      saveMember: jest.fn((_b: string, _m: never, m: unknown) =>
        Promise.resolve(m),
      ),
      list: jest.fn(),
      findById: jest.fn().mockResolvedValue(member()),
      updateMember: jest.fn(
        (_b: string, m: TeamMember, data: Partial<TeamMember>) =>
          Promise.resolve({ ...m, ...data }),
      ),
      updateUser: jest.fn(),
      removeMember: jest.fn(),
    };
    usersRepository = { findByEmail: jest.fn().mockResolvedValue(null) };
    principals = { invalidate: jest.fn() };
    (bcrypt.hash as jest.Mock).mockImplementation(
      (value: string) => `hashed:${value}`,
    );

    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new TeamService(
      teamRepository as unknown as TeamRepository,
      usersRepository as unknown as UsersRepository,
      principals as unknown as PrincipalService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('list and findOne', () => {
    it('lists the business members', async () => {
      const query: QueryTeamDto = { page: 1, limit: 20, role: 'manager' };
      await service.list(owner, query);
      expect(teamRepository.list).toHaveBeenCalledWith('b1', {
        page: 1,
        limit: 20,
        role: 'manager',
        status: undefined,
      });
    });

    it('throws NotFoundException for a member of another business', async () => {
      teamRepository.findById.mockResolvedValue(null);
      await expect(service.findOne(owner, 'x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(teamRepository.findById).toHaveBeenCalledWith('b1', 'x');
    });
  });

  describe('inviteMember', () => {
    it('refuses an email that already has an account', async () => {
      usersRepository.findByEmail.mockResolvedValue({ id: 'other' });
      await expect(service.inviteMember(owner, dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("gives a new member the role's preset and a matching login role", async () => {
      const result = await service.inviteMember(owner, dto);

      expect(teamRepository.createUser).toHaveBeenCalledWith(
        'b1',
        expect.anything(),
        expect.objectContaining({ role: 'cashier', status: 'invited' }),
      );
      expect(teamRepository.createMember).toHaveBeenCalledWith(
        'b1',
        expect.anything(),
        expect.objectContaining({
          role: 'cashier',
          permissions: ['sales.record'],
          maxDiscountPercent: 0,
        }),
      );
      expect(result).toMatchObject({
        role: 'cashier',
        permissions: ['sales.record'],
        status: 'invited',
      });
    });

    it('uses the manager preset for a manager', async () => {
      await service.inviteMember(owner, { ...dto, role: 'manager' });
      expect(teamRepository.createMember).toHaveBeenCalledWith(
        'b1',
        expect.anything(),
        expect.objectContaining({
          permissions: [
            'sales.record',
            'sales.discount',
            'sales.refund',
            'products.restock',
          ],
          maxDiscountPercent: 10,
        }),
      );
    });

    it('returns the temporary password once and stores only its hash', async () => {
      const result = await service.inviteMember(owner, dto);
      expect(result.temporaryPassword).toMatch(/^[0-9a-f]{16}$/);
      expect(teamRepository.createUser).toHaveBeenCalledWith(
        'b1',
        expect.anything(),
        expect.objectContaining({
          password: `hashed:${result.temporaryPassword}`,
        }),
      );
    });

    it('stops a manager granting permissions they do not hold', async () => {
      await expect(
        service.inviteMember(manager, {
          ...dto,
          permissions: ['sales.record', 'billing.manage'],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.inviteMember(manager, { ...dto, maxDiscountPercent: 20 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(teamRepository.transaction).not.toHaveBeenCalled();
    });

    it('lets a manager invite within what they hold', async () => {
      await expect(
        service.inviteMember(manager, { ...dto, maxDiscountPercent: 5 }),
      ).resolves.toMatchObject({ maxDiscountPercent: 5 });
    });
  });

  describe('updateMember', () => {
    it('resets permissions to the new role preset and syncs the login', async () => {
      const saved = await service.updateMember(owner, 'm1', {
        role: 'manager',
      });

      expect(saved).toMatchObject({ role: 'manager', maxDiscountPercent: 10 });
      expect(teamRepository.updateUser).toHaveBeenCalledWith('b1', 'u2', {
        role: 'manager',
      });
      expect(principals.invalidate).toHaveBeenCalledWith('u2');
    });

    it('deactivates the login along with the member', async () => {
      await service.updateMember(owner, 'm1', { status: 'inactive' });
      expect(teamRepository.updateUser).toHaveBeenCalledWith('b1', 'u2', {
        status: 'inactive',
      });
      expect(principals.invalidate).toHaveBeenCalledWith('u2');
    });

    it('leaves the login alone for a department change', async () => {
      await service.updateMember(owner, 'm1', { department: 'Front' });
      expect(teamRepository.updateUser).not.toHaveBeenCalled();
    });

    it('does not let anyone change their own access', async () => {
      teamRepository.findById.mockResolvedValue({ ...member(), userId: 'u1' });
      await expect(
        service.updateMember(owner, 'm1', { role: 'cashier' }),
      ).rejects.toThrow('cannot change your own access');
    });

    it('stops a manager promoting someone beyond their own access', async () => {
      const limited = { ...manager, permissions: ['staff.manage' as const] };
      await expect(
        service.updateMember(limited, 'm1', { role: 'manager' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('updatePermissions', () => {
    it('saves the switches and discount cap, then invalidates', async () => {
      await service.updatePermissions(owner, 'm1', {
        permissions: ['sales.record', 'sales.refund', 'sales.record'],
        maxDiscountPercent: 15,
      });

      expect(teamRepository.updateMember).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ id: 'm1' }),
        {
          permissions: ['sales.record', 'sales.refund'],
          maxDiscountPercent: 15,
        },
      );
      expect(principals.invalidate).toHaveBeenCalledWith('u2');
    });

    it('keeps the current cap when none is sent', async () => {
      await service.updatePermissions(owner, 'm1', {
        permissions: ['sales.record'],
      });
      expect(teamRepository.updateMember).toHaveBeenCalledWith(
        'b1',
        expect.anything(),
        expect.objectContaining({ maxDiscountPercent: 0 }),
      );
    });

    it('throws NotFoundException for an unknown member', async () => {
      teamRepository.findById.mockResolvedValue(null);
      await expect(
        service.updatePermissions(owner, 'x', { permissions: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('removes the member and ends their access', async () => {
      await expect(service.removeMember(owner, 'm1')).resolves.toEqual({
        message: 'Team member removed successfully',
      });
      expect(teamRepository.removeMember).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ id: 'm1' }),
      );
      expect(principals.invalidate).toHaveBeenCalledWith('u2');
    });
  });

  describe('audit trail', () => {
    const lastEvent = () =>
      (audit.record.mock.lastCall as unknown[])[0] as Record<string, unknown>;

    it('records an invitation without the temporary password', async () => {
      await service.inviteMember(owner, dto);
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(lastEvent()).toMatchObject({
        businessId: 'b1',
        action: 'staff.invited',
        entityType: 'team_member',
        after: { role: 'cashier', permissions: ['sales.record'] },
      });
      expect(JSON.stringify(lastEvent())).not.toMatch(/temporaryPassword/);
    });

    it.each([
      [{ role: 'manager' as const }, 'staff.role_changed'],
      [{ status: 'inactive' as const }, 'staff.status_changed'],
      [{ department: 'Front desk' }, 'staff.updated'],
    ])('records %o as %s', async (update, action) => {
      await service.updateMember(owner, 'm1', update);
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(lastEvent()).toMatchObject({ action, entityId: 'm1' });
    });

    it('records permission changes with before and after', async () => {
      await service.updatePermissions(owner, 'm1', {
        permissions: ['sales.record', 'sales.refund'],
        maxDiscountPercent: 5,
      });
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(lastEvent()).toMatchObject({
        action: 'staff.permissions_changed',
        before: { permissions: ['sales.record'], maxDiscountPercent: 0 },
        after: {
          permissions: ['sales.record', 'sales.refund'],
          maxDiscountPercent: 5,
        },
      });
    });

    it('records a removal', async () => {
      await service.removeMember(owner, 'm1');
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(lastEvent()).toMatchObject({
        action: 'staff.removed',
        before: { name: 'Jane Doe' },
      });
    });

    it('records nothing when the change is refused', async () => {
      await expect(
        service.updatePermissions(manager, 'm1', {
          permissions: ['billing.manage'],
        }),
      ).rejects.toThrow();
      expect(audit.record).not.toHaveBeenCalled();
    });
  });
});
