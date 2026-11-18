import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { AI_RULE, RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { QueryInsightsDtoSchema } from './dto/query-insights.dto';
import type { QueryInsightsDto } from './dto/query-insights.dto';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Post('generate')
  // RateLimitGuard again after JwtAuthGuard: the AI rule counts per business.
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, RateLimitGuard)
  @RateLimit(AI_RULE)
  @Roles('owner', 'manager')
  @RequirePermissions('view-reports')
  generate(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(QueryInsightsDtoSchema))
    query: QueryInsightsDto,
  ) {
    return this.insightsService.generate(user, query);
  }

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

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('owner', 'manager')
  @RequirePermissions('view-reports')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.insightsService.findOne(user, id);
  }
}
