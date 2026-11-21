import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  ZodValidationPipe,
} from '../common';
import type { CurrentUserPayload } from '../common';
import { ReportingService } from './reporting.service';
import {
  PaymentMethodsQuerySchema,
  PnlQuerySchema,
  RevenueSeriesQuerySchema,
  SummaryQuerySchema,
  TopProductsQuerySchema,
} from './dto/reporting.dto';
import type {
  PaymentMethodsQuery,
  PnlQuery,
  RevenueSeriesQuery,
  SummaryQuery,
  TopProductsQuery,
} from './dto/reporting.dto';

/**
 * Dashboard and reports v2 (T38). Every member may read sales figures; cost
 * and profit fields are removed for anyone without reports.view_profit, and
 * the P&L needs it outright. Registered before ReportsModule so these static
 * paths win over `GET /reports/:id`.
 */
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}

  /** GET /dashboard/summary?period=today|7d|month */
  @Get('dashboard/summary')
  summary(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(SummaryQuerySchema)) q: SummaryQuery,
  ) {
    return this.reporting.summary(user, q.period);
  }

  /** GET /reports/revenue-series?from&to&compare=previous */
  @Get('reports/revenue-series')
  revenueSeries(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(RevenueSeriesQuerySchema))
    q: RevenueSeriesQuery,
  ) {
    return this.reporting.revenueSeries(user, q);
  }

  /** GET /reports/top-products?period&by=units|revenue&limit */
  @Get('reports/top-products')
  topProducts(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(TopProductsQuerySchema)) q: TopProductsQuery,
  ) {
    return this.reporting.topProducts(user, q);
  }

  /** GET /reports/payment-methods?period */
  @Get('reports/payment-methods')
  paymentMethods(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(PaymentMethodsQuerySchema))
    q: PaymentMethodsQuery,
  ) {
    return this.reporting.paymentMethods(user, q);
  }

  /** GET /reports/pnl?from&to. Requires: reports.view_profit */
  @Get('reports/pnl')
  @RequirePermissions('reports.view_profit')
  pnl(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(PnlQuerySchema)) q: PnlQuery,
  ) {
    return this.reporting.pnl(user, q);
  }
}
