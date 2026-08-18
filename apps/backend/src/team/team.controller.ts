import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  Roles,
  RolesGuard,
  ZodValidationPipe,
} from '../common';
import type { CurrentUserPayload } from '../common';
import { TeamService } from './team.service';
import { InviteMemberDtoSchema } from './dto/invite-member.dto';
import { UpdateMemberDtoSchema } from './dto/update-member.dto';
import { UpdatePermissionsDtoSchema } from './dto/update-permissions.dto';
import { QueryTeamDtoSchema } from './dto/query-team.dto';
import type { InviteMemberDto } from './dto/invite-member.dto';
import type { UpdateMemberDto } from './dto/update-member.dto';
import type { UpdatePermissionsDto } from './dto/update-permissions.dto';
import type { QueryTeamDto } from './dto/query-team.dto';

@Controller('team')
export class TeamController {
  constructor(private teamService: TeamService) {}

  /**
   * List all team members for the current business
   * GET /team?page=1&limit=20&role=manager&status=active
   * Requires: owner | manager with assign-roles
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('owner', 'manager')
  @RequirePermissions('assign-roles')
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(QueryTeamDtoSchema)) query: QueryTeamDto,
  ) {
    return this.teamService.list(user, query);
  }

  /**
   * Get a single team member's details
   * GET /team/:id
   * Requires: authenticated
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teamService.findOne(user, id);
  }

  /**
   * Invite a new member (creates User + TeamMember atomically)
   * POST /team
   * Requires: owner | manager with assign-roles
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('owner', 'manager')
  @RequirePermissions('assign-roles')
  @HttpCode(201)
  invite(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(InviteMemberDtoSchema))
    inviteDto: InviteMemberDto,
  ) {
    return this.teamService.inviteMember(user, inviteDto);
  }

  /**
   * Update a member's role, status, or department
   * PATCH /team/:id
   * Requires: owner | manager with assign-roles
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('owner', 'manager')
  @RequirePermissions('assign-roles')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateMemberDtoSchema))
    updateDto: UpdateMemberDto,
  ) {
    return this.teamService.updateMember(user, id, updateDto);
  }

  /**
   * Update a member's granular permissions array
   * PATCH /team/:id/permissions
   * Requires: owner | manager with assign-roles
   */
  @Patch(':id/permissions')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('owner', 'manager')
  @RequirePermissions('assign-roles')
  updatePermissions(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdatePermissionsDtoSchema))
    updatePermissionsDto: UpdatePermissionsDto,
  ) {
    return this.teamService.updatePermissions(user, id, updatePermissionsDto);
  }

  /**
   * Remove a team member
   * DELETE /team/:id
   * Requires: owner only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teamService.removeMember(user, id);
  }
}
