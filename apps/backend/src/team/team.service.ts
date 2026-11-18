import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { hashPassword } from '../auth/passwords/password-hasher';
import type { TeamMember } from '../entities/team-member.entity';
import type { CurrentUserPayload } from '../common';
import { ROLE_PRESETS, type Permission } from '../common/constants/permissions';
import { TeamRepository } from './team.repository';
import type { TeamMemberUpdateData } from './team.repository';
import { UsersRepository } from '../auth/users.repository';
import { PrincipalService } from '../auth/principal.service';
import type { InviteMemberDto } from './dto/invite-member.dto';
import type { UpdateMemberDto } from './dto/update-member.dto';
import type { UpdatePermissionsDto } from './dto/update-permissions.dto';
import type { QueryTeamDto } from './dto/query-team.dto';

type Actor = Pick<
  CurrentUserPayload,
  'id' | 'role' | 'businessId' | 'businessName' | 'permissions'
> &
  Partial<Pick<CurrentUserPayload, 'maxDiscountPercent'>>;

/**
 * Team members and what they may do. Every change that affects access
 * invalidates the member's cached principal, so it applies on their next
 * request.
 */
@Injectable()
export class TeamService {
  constructor(
    private teamRepository: TeamRepository,
    private usersRepository: UsersRepository,
    private principals: PrincipalService,
  ) {}

  async list(actor: Pick<Actor, 'businessId'>, query: QueryTeamDto) {
    return this.teamRepository.list(actor.businessId, {
      page: query.page,
      limit: query.limit,
      role: query.role,
      status: query.status,
    });
  }

  async findOne(
    actor: Pick<Actor, 'businessId'>,
    id: string,
  ): Promise<TeamMember> {
    const member = await this.teamRepository.findById(actor.businessId, id);
    if (!member) throw new NotFoundException('Team member not found');
    return member;
  }

  async inviteMember(actor: Actor, inviteDto: InviteMemberDto) {
    const preset = ROLE_PRESETS[inviteDto.role];
    const permissions = inviteDto.permissions ?? [...preset.permissions];
    const maxDiscountPercent =
      inviteDto.maxDiscountPercent ?? preset.maxDiscountPercent;
    this.assertMayGrant(actor, permissions, maxDiscountPercent);

    const existing = await this.usersRepository.findByEmail(inviteDto.email);
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    // Generate a one-time temporary password. The plaintext is returned to the
    // caller exactly once so the owner can share it with the invited member; only
    // the hash is ever stored, and the plaintext is never logged.
    const temporaryPassword = randomBytes(8).toString('hex');
    const tempPasswordHash = await hashPassword(temporaryPassword);
    const businessId = actor.businessId;

    return this.teamRepository.transaction(async (manager) => {
      const newUser = this.teamRepository.createUser(businessId, manager, {
        email: inviteDto.email,
        password: tempPasswordHash,
        firstName: inviteDto.name.split(' ')[0] || inviteDto.name,
        lastName: inviteDto.name.split(' ').slice(1).join(' ') || '',
        businessName: actor.businessName,
        role: inviteDto.role,
        status: 'invited',
      });
      const savedUser = await this.teamRepository.saveUser(
        businessId,
        manager,
        newUser,
      );

      const teamMember = this.teamRepository.createMember(businessId, manager, {
        userId: savedUser.id,
        name: inviteDto.name,
        role: inviteDto.role,
        permissions,
        maxDiscountPercent,
        department: inviteDto.department,
        status: 'invited',
        joinedDate: new Date(),
      });
      const savedMember = await this.teamRepository.saveMember(
        businessId,
        manager,
        teamMember,
      );

      return {
        id: savedMember.id,
        email: savedUser.email,
        name: savedMember.name,
        role: savedMember.role,
        permissions: savedMember.permissions,
        maxDiscountPercent: savedMember.maxDiscountPercent,
        status: savedMember.status,
        message: 'Invitation created',
        temporaryPassword,
      };
    });
  }

  /**
   * Role, status or department. A role change resets permissions to that
   * role's preset; fine-tune them afterwards with `updatePermissions`.
   */
  async updateMember(
    actor: Actor,
    id: string,
    updateDto: UpdateMemberDto,
  ): Promise<TeamMember> {
    const member = await this.findOther(actor, id);
    const data: TeamMemberUpdateData = {};

    if (updateDto.role && updateDto.role !== member.role) {
      const preset = ROLE_PRESETS[updateDto.role];
      this.assertMayGrant(actor, preset.permissions, preset.maxDiscountPercent);
      data.role = updateDto.role;
      data.permissions = [...preset.permissions];
      data.maxDiscountPercent = preset.maxDiscountPercent;
    }
    if (updateDto.status) data.status = updateDto.status;
    if (updateDto.department !== undefined) {
      data.department = updateDto.department;
    }

    const saved = await this.teamRepository.updateMember(
      actor.businessId,
      member,
      data,
    );
    if (data.role || data.status) {
      await this.teamRepository.updateUser(actor.businessId, member.userId, {
        ...(data.role ? { role: data.role } : {}),
        ...(data.status === 'inactive' ? { status: 'inactive' } : {}),
        ...(data.status === 'active' ? { status: 'active' } : {}),
      });
    }
    this.principals.invalidate(member.userId);
    return saved;
  }

  async removeMember(actor: Actor, id: string): Promise<{ message: string }> {
    const member = await this.findOther(actor, id);
    await this.teamRepository.removeMember(actor.businessId, member);
    this.principals.invalidate(member.userId);
    return { message: 'Team member removed successfully' };
  }

  async updatePermissions(
    actor: Actor,
    id: string,
    dto: UpdatePermissionsDto,
  ): Promise<TeamMember> {
    const member = await this.findOther(actor, id);
    const maxDiscountPercent =
      dto.maxDiscountPercent ?? member.maxDiscountPercent;
    this.assertMayGrant(actor, dto.permissions, maxDiscountPercent);

    const saved = await this.teamRepository.updateMember(
      actor.businessId,
      member,
      { permissions: [...new Set(dto.permissions)], maxDiscountPercent },
    );
    this.principals.invalidate(member.userId);
    return saved;
  }

  /** A member of this business other than the actor themselves. */
  private async findOther(actor: Actor, id: string): Promise<TeamMember> {
    const member = await this.findOne(actor, id);
    if (member.userId === actor.id) {
      throw new ForbiddenException('You cannot change your own access');
    }
    return member;
  }

  /** Non-owners may only hand out what they hold themselves. */
  private assertMayGrant(
    actor: Actor,
    permissions: readonly Permission[],
    maxDiscountPercent: number,
  ): void {
    if (actor.role === 'owner') return;
    const missing = permissions.filter((p) => !actor.permissions.includes(p));
    if (
      missing.length > 0 ||
      maxDiscountPercent > (actor.maxDiscountPercent ?? 0)
    ) {
      throw new ForbiddenException(
        'You can only grant permissions you hold yourself',
      );
    }
  }
}
