import { Test, TestingModule } from '@nestjs/testing';
import {
  AnalyticsController,
  DashboardController,
} from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard, RolesGuard } from '../common';

describe('AnalyticsController', () => {
  let analyticsController: AnalyticsController;
  let dashboardController: DashboardController;
  let analyticsService: {
    summary: jest.Mock;
    salesChart: jest.Mock;
    categoryBreakdown: jest.Mock;
    topProducts: jest.Mock;
    dashboard: jest.Mock;
  };

  const currentUser = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner',
    businessName: 'LUXA',
    businessId: 'b1',
  };

  beforeEach(async () => {
    analyticsService = {
      summary: jest.fn(),
      salesChart: jest.fn(),
      categoryBreakdown: jest.fn(),
      topProducts: jest.fn(),
      dashboard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController, DashboardController],
      providers: [{ provide: AnalyticsService, useValue: analyticsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    analyticsController = module.get(AnalyticsController);
    dashboardController = module.get(DashboardController);
  });

  it('delegates summary to the service', async () => {
    const query = { period: 'week' as const };
    analyticsService.summary.mockResolvedValue({ period: 'week' });

    await expect(
      analyticsController.summary(currentUser, query),
    ).resolves.toEqual({ period: 'week' });
    expect(analyticsService.summary).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates salesChart to the service', async () => {
    const query = { period: 'today' as const };
    analyticsService.salesChart.mockResolvedValue({ period: 'today' });

    await expect(
      analyticsController.salesChart(currentUser, query),
    ).resolves.toEqual({ period: 'today' });
    expect(analyticsService.salesChart).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates categoryBreakdown to the service', async () => {
    const query = { period: 'month' as const };
    analyticsService.categoryBreakdown.mockResolvedValue({ period: 'month' });

    await expect(
      analyticsController.categoryBreakdown(currentUser, query),
    ).resolves.toEqual({ period: 'month' });
    expect(analyticsService.categoryBreakdown).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates topProducts to the service', async () => {
    const query = { period: 'week' as const };
    analyticsService.topProducts.mockResolvedValue({ period: 'week' });

    await expect(
      analyticsController.topProducts(currentUser, query),
    ).resolves.toEqual({ period: 'week' });
    expect(analyticsService.topProducts).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates dashboard to the service', async () => {
    analyticsService.dashboard.mockResolvedValue({ metrics: {} });

    await expect(dashboardController.dashboard(currentUser)).resolves.toEqual({
      metrics: {},
    });
    expect(analyticsService.dashboard).toHaveBeenCalledWith(currentUser);
  });
});
