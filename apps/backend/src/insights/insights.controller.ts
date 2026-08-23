import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
import { InsightsService } from './insights.service';
import { QueryInsightsDtoSchema } from './dto/query-insights.dto';
import type { QueryInsightsDto } from './dto/query-insights.dto';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  /**
   * Live-computed prioritized insights
   * GET /insights?limit=10&type=restock&priority=high
   * Requires: owner | manager with view-reports
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('owner', 'manager')
  @RequirePermissions('view-reports')
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(QueryInsightsDtoSchema))
    query: QueryInsightsDto,
  ) {
    return this.insightsService.list(user, query);
  }

  /**
   * One insight with supporting numbers
   * GET /insights/:id
   * Requires: owner | manager with view-reports
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('owner', 'manager')
  @RequirePermissions('view-reports')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.insightsService.findOne(user, id);
  }
}
