import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import type { TeamMember } from '../entities/team-member.entity';
import type { CurrentUserPayload } from '../common';
import { TeamRepository } from './team.repository';
import type { TeamMemberUpdateData } from './team.repository';
import { UsersRepository } from '../auth/users.repository';
import type { InviteMemberDto } from './dto/invite-member.dto';
import type { UpdateMemberDto } from './dto/update-member.dto';
import type { UpdatePermissionsDto } from './dto/update-permissions.dto';
import type { QueryTeamDto } from './dto/query-team.dto';

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

    return this.teamRepository.transaction(async (manager) => {
      const tempPassword = await bcrypt.hash(
        randomBytes(8).toString('hex'),
        10,
      );

      const newUser = this.teamRepository.createUser(manager, {
        email: inviteDto.email,
        password: tempPassword,
        firstName: inviteDto.name.split(' ')[0] || inviteDto.name,
        lastName: inviteDto.name.split(' ').slice(1).join(' ') || '',
        businessName: user.businessName,
        businessId: user.businessId,
        role: inviteDto.role === 'manager' ? 'manager' : 'apprentice',
        staffRole: inviteDto.role,
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
        message: 'Invitation sent to email',
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
