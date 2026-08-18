import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  ZodValidationPipe,
} from '../common';
import type { CurrentUserPayload } from '../common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDtoSchema } from './dto/analytics-query.dto';
import type { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Summary metrics with period filtering and period-over-period trends
   * GET /analytics/summary?period=today|week|month
   * Requires: owner | manager
   */
  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  summary(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(AnalyticsQueryDtoSchema))
    query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.summary(user, query);
  }

  /**
   * Time-bucketed sales series for chart visualizations
   * GET /analytics/sales-chart?period=today|week|month
   * Requires: owner | manager
   */
  @Get('sales-chart')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  salesChart(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(AnalyticsQueryDtoSchema))
    query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.salesChart(user, query);
  }

  /**
   * Revenue & units grouped by product category
   * GET /analytics/category-breakdown?period=today|week|month
   * Requires: owner | manager
   */
  @Get('category-breakdown')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  categoryBreakdown(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(AnalyticsQueryDtoSchema))
    query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.categoryBreakdown(user, query);
  }

  /**
   * Top selling products ranked by revenue & units
   * GET /analytics/top-products?period=today|week|month
   * Requires: owner | manager
   */
  @Get('top-products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  topProducts(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(AnalyticsQueryDtoSchema))
    query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.topProducts(user, query);
  }
}

@Controller('dashboard')
export class DashboardController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Complete dashboard overview: metrics, inventory breakdown, top products, recent sales
   * GET /dashboard
   * Requires: owner | manager
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  dashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.analyticsService.dashboard(user);
  }
}
