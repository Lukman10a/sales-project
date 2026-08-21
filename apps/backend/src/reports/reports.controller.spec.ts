import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from '../common';
import { CreateReportDtoSchema } from './dto/create-report.dto';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: {
    generate: jest.Mock;
    list: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };

  const currentUser = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner',
    businessName: 'LUXA',
    businessId: 'b1',
  };

  beforeEach(async () => {
    reportsService = {
      generate: jest.fn(),
      list: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: reportsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ReportsController);
  });

  it('delegates generate to the service with the validated dto', async () => {
    const dto = {
      name: 'August Sales',
      type: 'sales' as const,
      format: 'pdf' as const,
      dateRange: { start: '2026-08-01', end: '2026-08-20' },
      includeCategories: true,
    };
    reportsService.generate.mockResolvedValue({ id: 'r1' });

    await expect(controller.generate(currentUser, dto)).resolves.toEqual({
      id: 'r1',
    });
    expect(reportsService.generate).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates list to the service with the query params', async () => {
    const query = { page: 1, limit: 20 };
    reportsService.list.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await expect(controller.list(currentUser, query)).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    expect(reportsService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates findOne to the service', async () => {
    reportsService.findOne.mockResolvedValue({ id: 'r1' });

    await expect(controller.findOne(currentUser, 'r1')).resolves.toEqual({
      id: 'r1',
    });
    expect(reportsService.findOne).toHaveBeenCalledWith(currentUser, 'r1');
  });

  it('delegates remove to the service', async () => {
    reportsService.remove.mockResolvedValue({
      message: 'Report deleted successfully',
    });

    await expect(controller.remove(currentUser, 'r1')).resolves.toEqual({
      message: 'Report deleted successfully',
    });
    expect(reportsService.remove).toHaveBeenCalledWith(currentUser, 'r1');
  });

  describe('CreateReportDtoSchema', () => {
    it('accepts a valid payload with optional include flags', () => {
      expect(
        CreateReportDtoSchema.parse({
          name: 'August Sales',
          type: 'sales',
          format: 'pdf',
          dateRange: { start: '2026-08-01', end: '2026-08-20' },
          includeCategories: true,
          includeExpenses: false,
        }),
      ).toEqual({
        name: 'August Sales',
        type: 'sales',
        format: 'pdf',
        dateRange: { start: '2026-08-01', end: '2026-08-20' },
        includeCategories: true,
        includeExpenses: false,
      });
    });

    it('rejects an end date before the start date', () => {
      expect(() =>
        CreateReportDtoSchema.parse({
          name: 'Bad',
          type: 'sales',
          format: 'pdf',
          dateRange: { start: '2026-08-20', end: '2026-08-01' },
        }),
      ).toThrow();
    });

    it('rejects a non-ISO date', () => {
      expect(() =>
        CreateReportDtoSchema.parse({
          name: 'Bad',
          type: 'sales',
          format: 'pdf',
          dateRange: { start: '08/01/2026', end: '2026-08-20' },
        }),
      ).toThrow();
    });

    it('rejects an unknown type', () => {
      expect(() =>
        CreateReportDtoSchema.parse({
          name: 'Bad',
          type: 'nonsense',
          format: 'pdf',
          dateRange: { start: '2026-08-01', end: '2026-08-20' },
        }),
      ).toThrow();
    });
  });
});
