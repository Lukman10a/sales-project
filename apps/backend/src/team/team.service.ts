import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import type { TeamMember } from '../entities/team-member.entity';
import type { User } from '../entities/user.entity';
import type { CurrentUserPayload } from '../common';
import { TeamRepository } from './team.repository';
import type { TeamMemberUpdateData } from './team.repository';
import { UsersRepository } from '../auth/users.repository';
import { TEAM_ROLES } from './team.constants';
import type { InviteMemberDto } from './dto/invite-member.dto';
import type { UpdateMemberDto } from './dto/update-member.dto';
import type { UpdatePermissionsDto } from './dto/update-permissions.dto';
import type { QueryTeamDto } from './dto/query-team.dto';

type TeamRoleValue = (typeof TEAM_ROLES)[number];

/**
 * Map a team role to the login-facing user record. Team roles other than
 * `manager` live on an `apprentice` account distinguished by `staffRole`
 * (e.g. `investor`); `manager` gets the dedicated manager account.
 */
function mapTeamRoleToLogin(role: TeamRoleValue): {
  role: 'manager' | 'apprentice';
  staffRole: NonNullable<User['staffRole']>;
} {
  if (role === 'manager') return { role: 'manager', staffRole: 'manager' };
  if (role === 'investor') return { role: 'apprentice', staffRole: 'investor' };
  return { role: 'apprentice', staffRole: role };
}

@Injectable()
export class TeamService {
  constructor(
    private teamRepository: TeamRepository,
    private usersRepository: UsersRepository,
  ) {}

  async list(user: { businessId: string }, query: QueryTeamDto) {
    return this.teamRepository.list({
      businessId: user.businessId,
      page: query.page,
      limit: query.limit,
      role: query.role,
      status: query.status,
    });
  }

  async findOne(user: { businessId: string }, id: string): Promise<TeamMember> {
    const member = await this.teamRepository.findByIdAndBusiness(
      id,
      user.businessId,
    );
    if (!member) {
      throw new NotFoundException('Team member not found');
    }
    return member;
  }

  async inviteMember(user: CurrentUserPayload, inviteDto: InviteMemberDto) {
    const existing = await this.usersRepository.findByEmail(inviteDto.email);
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    // Generate a one-time temporary password. The plaintext is returned to the
    // caller exactly once so the owner can share it with the invited member; only
    // the hash is ever stored, and the plaintext is never logged.
    const temporaryPassword = randomBytes(8).toString('hex');
    const tempPasswordHash = await bcrypt.hash(temporaryPassword, 10);

    return this.teamRepository.transaction(async (manager) => {
      const login = mapTeamRoleToLogin(inviteDto.role);
      const newUser = this.teamRepository.createUser(manager, {
        email: inviteDto.email,
        password: tempPasswordHash,
        firstName: inviteDto.name.split(' ')[0] || inviteDto.name,
        lastName: inviteDto.name.split(' ').slice(1).join(' ') || '',
        businessName: user.businessName,
        businessId: user.businessId,
        role: login.role,
        staffRole: login.staffRole,
        status: 'invited',
      });
      const savedUser = await this.teamRepository.saveUser(manager, newUser);

      const teamMember = this.teamRepository.createMember(manager, {
        businessId: user.businessId,
        userId: savedUser.id,
        name: inviteDto.name,
        role: inviteDto.role,
        permissions: inviteDto.permissions ?? [],
        department: inviteDto.department,
        status: 'invited',
        joinedDate: new Date(),
      });
      const savedMember = await this.teamRepository.saveMember(
        manager,
        teamMember,
      );

      return {
        id: savedMember.id,
        email: savedUser.email,
        name: savedMember.name,
        role: savedMember.role,
        status: savedMember.status,
        message: 'Invitation created',
        temporaryPassword,
      };
    });
  }

  async updateMember(
    user: { businessId: string },
    id: string,
    updateDto: UpdateMemberDto,
  ): Promise<TeamMember> {
    const member = await this.teamRepository.findByIdAndBusiness(
      id,
      user.businessId,
    );
    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    const data: TeamMemberUpdateData = {};
    if (updateDto.role) {
      data.role = updateDto.role;
      // Keep the login-facing user record in sync so reassigning a member
      // to/from `investor` (or any team role) changes what they can log in as.
      const user = await this.usersRepository.findById(member.userId);
      if (user) {
        const login = mapTeamRoleToLogin(updateDto.role);
        user.role = login.role;
        user.staffRole = login.staffRole;
        await this.usersRepository.save(user);
      }
    }
    if (updateDto.status) {
      data.status = updateDto.status;
    }
    if (updateDto.department !== undefined) {
      data.department = updateDto.department;
    }

    return this.teamRepository.updateMember(member, data);
  }

  async removeMember(
    user: { businessId: string },
    id: string,
  ): Promise<{ message: string }> {
    const member = await this.teamRepository.findByIdAndBusiness(
      id,
      user.businessId,
    );
    if (!member) {
      throw new NotFoundException('Team member not found');
    }
    await this.teamRepository.removeMember(member);
    return { message: 'Team member removed successfully' };
  }

  async updatePermissions(
    user: { businessId: string },
    id: string,
    updatePermissionsDto: UpdatePermissionsDto,
  ): Promise<TeamMember> {
    const member = await this.teamRepository.findByIdAndBusiness(
      id,
      user.businessId,
    );
    if (!member) {
      throw new NotFoundException('Team member not found');
    }
    return this.teamRepository.updatePermissions(
      member,
      updatePermissionsDto.permissions,
    );
  }
}
