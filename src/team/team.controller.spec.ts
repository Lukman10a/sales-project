import { Test, TestingModule } from '@nestjs/testing';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from '../common';
import type { InviteMemberDto } from './dto/invite-member.dto';
import type { UpdateMemberDto } from './dto/update-member.dto';
import type { UpdatePermissionsDto } from './dto/update-permissions.dto';

describe('TeamController', () => {
  let controller: TeamController;
  let teamService: {
    list: jest.Mock;
    findOne: jest.Mock;
    inviteMember: jest.Mock;
    updateMember: jest.Mock;
    removeMember: jest.Mock;
    updatePermissions: jest.Mock;
  };

  const currentUser = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner',
    businessName: 'LUXA',
    businessId: 'b1',
  };

  beforeEach(async () => {
    teamService = {
      list: jest.fn(),
      findOne: jest.fn(),
      inviteMember: jest.fn(),
      updateMember: jest.fn(),
      removeMember: jest.fn(),
      updatePermissions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamController],
      providers: [{ provide: TeamService, useValue: teamService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(TeamController);
  });

  it('delegates list to the service', async () => {
    const query = { page: 1, limit: 20 };
    teamService.list.mockResolvedValue({ data: [], pagination: {} });

    await expect(controller.list(currentUser, query)).resolves.toEqual({
      data: [],
      pagination: {},
    });
    expect(teamService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates findOne to the service', async () => {
    teamService.findOne.mockResolvedValue({ id: 'm1' });

    await expect(controller.findOne(currentUser, 'm1')).resolves.toEqual({
      id: 'm1',
    });
    expect(teamService.findOne).toHaveBeenCalledWith(currentUser, 'm1');
  });

  it('delegates invite to the service', async () => {
    const dto: InviteMemberDto = {
      email: 'a@b.com',
      name: 'Jane',
      role: 'manager',
    };
    teamService.inviteMember.mockResolvedValue({ id: 'm1' });

    await expect(controller.invite(currentUser, dto)).resolves.toEqual({
      id: 'm1',
    });
    expect(teamService.inviteMember).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates update to the service', async () => {
    const dto: UpdateMemberDto = { role: 'manager' };
    teamService.updateMember.mockResolvedValue({ id: 'm1' });

    await expect(controller.update(currentUser, 'm1', dto)).resolves.toEqual({
      id: 'm1',
    });
    expect(teamService.updateMember).toHaveBeenCalledWith(
      currentUser,
      'm1',
      dto,
    );
  });

  it('delegates updatePermissions to the service', async () => {
    const dto: UpdatePermissionsDto = { permissions: ['view-products'] };
    teamService.updatePermissions.mockResolvedValue({ id: 'm1' });

    await expect(
      controller.updatePermissions(currentUser, 'm1', dto),
    ).resolves.toEqual({ id: 'm1' });
    expect(teamService.updatePermissions).toHaveBeenCalledWith(
      currentUser,
      'm1',
      dto,
    );
  });

  it('delegates remove to the service', async () => {
    teamService.removeMember.mockResolvedValue({
      message: 'Team member removed successfully',
    });

    await expect(controller.remove(currentUser, 'm1')).resolves.toEqual({
      message: 'Team member removed successfully',
    });
    expect(teamService.removeMember).toHaveBeenCalledWith(currentUser, 'm1');
  });
});
