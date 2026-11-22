import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  ZodValidationPipe,
} from '../common';
import type { CurrentUserPayload } from '../common';
import { TeamActivityService } from './team-activity.service';
import { QueryActivityDtoSchema } from './dto/query-activity.dto';
import type { QueryActivityDto } from './dto/query-activity.dto';

@Controller('team')
export class TeamActivityController {
  constructor(private readonly activityService: TeamActivityService) {}

  @Get('activity')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff.manage')
  getActivity(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(QueryActivityDtoSchema))
    query: QueryActivityDto,
  ) {
    return this.activityService.getActivity(user, query);
  }
}
