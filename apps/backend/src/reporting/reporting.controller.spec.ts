import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PATH_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard, PermissionsGuard, PERMISSIONS_KEY } from '../common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import {
  PnlQuerySchema,
  RevenueSeriesQuerySchema,
  SummaryQuerySchema,
  TopProductsQuerySchema,
} from './dto/reporting.dto';

describe('ReportingController', () => {
  let controller: ReportingController;
  const service = {
    summary: jest.fn(),
    revenueSeries: jest.fn(),
    topProducts: jest.fn(),
    paymentMethods: jest.fn(),
    pnl: jest.fn(),
  };
  const user = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner' as const,
    permissions: [],
    maxDiscountPercent: 100,
    businessName: 'LUXA',
    businessId: 'b1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [ReportingController],
      providers: [{ provide: ReportingService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ReportingController);
  });

  it('delegates each report to the service', async () => {
    await controller.summary(user, { period: '7d' });
    expect(service.summary).toHaveBeenCalledWith(user, '7d');

    const series = {
      from: '2026-11-01',
      to: '2026-11-07',
      compare: 'previous' as const,
    };
    await controller.revenueSeries(user, series);
    expect(service.revenueSeries).toHaveBeenCalledWith(user, series);

    const top = { period: 'today' as const, by: 'units' as const, limit: 5 };
    await controller.topProducts(user, top);
    expect(service.topProducts).toHaveBeenCalledWith(user, top);

    await controller.paymentMethods(user, { period: 'month' });
    expect(service.paymentMethods).toHaveBeenCalledWith(user, {
      period: 'month',
    });

    await controller.pnl(user, { from: '2026-11-01', to: '2026-11-30' });
    expect(service.pnl).toHaveBeenCalledWith(user, {
      from: '2026-11-01',
      to: '2026-11-30',
    });
  });

  it('opens sales figures to members but keeps the P&L behind view_profit', () => {
    const reflector = new Reflector();
    const handler = (name: keyof ReportingController) =>
      Object.getOwnPropertyDescriptor(ReportingController.prototype, name)!
        .value as () => unknown;
    expect(reflector.get(PERMISSIONS_KEY, handler('pnl'))).toEqual([
      'reports.view_profit',
    ]);
    for (const name of [
      'summary',
      'revenueSeries',
      'topProducts',
      'paymentMethods',
    ] as const) {
      expect(reflector.get(PERMISSIONS_KEY, handler(name))).toBeUndefined();
    }
    expect(Reflect.getMetadata(PATH_METADATA, handler('summary'))).toBe(
      'dashboard/summary',
    );
  });
});

describe('reporting DTOs', () => {
  it('defaults the summary to today and rejects other periods', () => {
    expect(SummaryQuerySchema.parse({}).period).toBe('today');
    expect(SummaryQuerySchema.safeParse({ period: 'year' }).success).toBe(
      false,
    );
  });

  it('checks ranges: order, real days, at most 366 days', () => {
    expect(
      PnlQuerySchema.safeParse({ from: '2026-11-02', to: '2026-11-01' })
        .success,
    ).toBe(false);
    expect(
      PnlQuerySchema.safeParse({ from: '2026-02-30', to: '2026-03-01' })
        .success,
    ).toBe(false);
    expect(
      PnlQuerySchema.safeParse({ from: '2025-01-01', to: '2026-01-02' })
        .success,
    ).toBe(false);
    expect(
      PnlQuerySchema.safeParse({ from: '2025-01-01', to: '2026-01-01' })
        .success,
    ).toBe(true);
    expect(
      RevenueSeriesQuerySchema.parse({ from: '2026-11-01', to: '2026-11-07' })
        .compare,
    ).toBe('none');
  });

  it('defaults top products to 10 by revenue over 7 days', () => {
    expect(TopProductsQuerySchema.parse({})).toEqual({
      period: '7d',
      by: 'revenue',
      limit: 10,
    });
    expect(TopProductsQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
  });
});
