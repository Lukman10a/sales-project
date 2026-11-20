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
   * Requires: staff.manage
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff.manage')
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(QueryTeamDtoSchema)) query: QueryTeamDto,
  ) {
    return this.teamService.list(user, query);
  }

  /**
   * Get a single team member's details
   * GET /team/:id
   * Requires: staff.manage
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff.manage')
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teamService.findOne(user, id);
  }

  /**
   * Invite a new member (creates User + TeamMember atomically)
   * POST /team
   * Requires: staff.manage
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff.manage')
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
   * Requires: staff.manage
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff.manage')
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
   * Requires: staff.manage
   */
  @Patch(':id/permissions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff.manage')
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
   * Requires: staff.manage
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff.manage')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teamService.removeMember(user, id);
  }
}
