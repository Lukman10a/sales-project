import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './reports.repository';
import { SalesRepository } from '../sales/sales.repository';
import { InventoryRepository } from '../inventory/inventory.repository';
import { Report } from '../entities/report.entity';

describe('ReportsService', () => {
  let service: ReportsService;
  let reportsRepository: {
    create: jest.Mock;
    list: jest.Mock;
    findById: jest.Mock;
    remove: jest.Mock;
    resolveCreatorNames: jest.Mock;
    profitSummary: jest.Mock;
  };
  let salesRepository: { list: jest.Mock };
  let inventoryRepository: { list: jest.Mock };

  const user = { id: 'u1', businessId: 'b1' };

  const report = {
    id: 'r1',
    businessId: 'b1',
    name: 'August Sales',
    type: 'sales',
    format: 'pdf',
    dateRange: { start: '2026-08-01', end: '2026-08-20' },
    status: 'completed',
    createdBy: 'u1',
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
  } as unknown as Report;

  beforeEach(() => {
    reportsRepository = {
      create: jest.fn(),
      list: jest.fn(),
      findById: jest.fn(),
      remove: jest.fn(),
      resolveCreatorNames: jest.fn(),
      profitSummary: jest.fn(),
    };
    salesRepository = { list: jest.fn() };
    inventoryRepository = { list: jest.fn() };

    service = new ReportsService(
      reportsRepository as unknown as ReportsRepository,
      salesRepository as unknown as SalesRepository,
      inventoryRepository as unknown as InventoryRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('persists a completed snapshot with createdBy for a sales-type report', async () => {
      salesRepository.list.mockResolvedValue({
        data: [
          {
            id: 's1',
            total: 100,
            paymentMethod: 'cash',
            status: 'completed',
            saleDate: new Date('2026-08-10'),
            customerName: 'Ada',
          },
        ],
        pagination: { total: 1 },
        summary: {
          totalSales: 100,
          totalTransactions: 1,
          averageTransaction: 100,
        },
      });
      reportsRepository.create.mockResolvedValue(report);

      const dto = {
        name: 'August Sales',
        type: 'sales' as const,
        format: 'pdf' as const,
        dateRange: { start: '2026-08-01', end: '2026-08-20' },
        includeCategories: true,
      };

      const result = await service.generate(user, dto);

      expect(salesRepository.list).toHaveBeenCalledWith({
        businessId: 'b1',
        page: 1,
        limit: 100,
        dateFrom: '2026-08-01',
        dateTo: '2026-08-20',
      });
      expect(reportsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'b1',
          name: 'August Sales',
          type: 'sales',
          format: 'pdf',
          status: 'completed',
          createdBy: 'u1',
          dateRange: { start: '2026-08-01', end: '2026-08-20' },
          snapshot: {
            type: 'sales',
            dateRange: { start: '2026-08-01', end: '2026-08-20' },
            summary: {
              totalSales: 100,
              totalTransactions: 1,
              averageTransaction: 100,
            },
            items: [
              {
                id: 's1',
                saleDate: new Date('2026-08-10'),
                total: 100,
                paymentMethod: 'cash',
                status: 'completed',
                customerName: 'Ada',
              },
            ],
          },
        }),
      );
      expect(result).toBe(report);
    });

    it('snapshots the inventory list for inventory-type reports', async () => {
      inventoryRepository.list.mockResolvedValue({
        data: [
          {
            id: 'i1',
            name: 'Widget',
            category: ['tools'],
            quantity: 5,
            sellingPrice: 10,
            wholesalePrice: 5,
            status: 'in-stock',
          },
        ],
        pagination: { total: 1 },
      });
      reportsRepository.create.mockResolvedValue(report);

      const dto = {
        name: 'Inventory',
        type: 'inventory' as const,
        format: 'csv' as const,
        dateRange: { start: '2026-08-01', end: '2026-08-20' },
      };

      await service.generate(user, dto);

      expect(inventoryRepository.list).toHaveBeenCalledWith({
        businessId: 'b1',
        page: 1,
        limit: 1000,
      });
      expect(reportsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          snapshot: {
            type: 'inventory',
            items: [
              {
                id: 'i1',
                name: 'Widget',
                category: ['tools'],
                sku: null,
                quantity: 5,
                sellingPrice: 10,
                wholesalePrice: 5,
                status: 'in-stock',
              },
            ],
          },
        }),
      );
    });

    it('snapshots a profit summary for profit-type reports', async () => {
      reportsRepository.profitSummary.mockResolvedValue({
        revenue: 100,
        orders: 2,
        netProfit: 40,
      });
      reportsRepository.create.mockResolvedValue(report);

      const dto = {
        name: 'Profit',
        type: 'profit' as const,
        format: 'pdf' as const,
        dateRange: { start: '2026-08-01', end: '2026-08-20' },
      };

      await service.generate(user, dto);

      expect(reportsRepository.profitSummary).toHaveBeenCalledWith(
        'b1',
        '2026-08-01',
        '2026-08-20',
      );
      expect(reportsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          snapshot: {
            type: 'profit',
            dateRange: { start: '2026-08-01', end: '2026-08-20' },
            summary: { revenue: 100, orders: 2, netProfit: 40 },
          },
        }),
      );
    });
  });

  describe('list', () => {
    it('is scoped to the business and enriches createdByName', async () => {
      reportsRepository.list.mockResolvedValue({
        data: [report],
        total: 1,
        page: 1,
        limit: 20,
      });
      reportsRepository.resolveCreatorNames.mockResolvedValue(
        new Map([['u1', 'Ada Lovelace']]),
      );

      const result = await service.list(user, { page: 1, limit: 20 });

      expect(reportsRepository.list).toHaveBeenCalledWith('b1', 1, 20);
      expect(reportsRepository.resolveCreatorNames).toHaveBeenCalledWith([
        'u1',
      ]);
      expect(result).toEqual({
        data: [{ ...report, createdByName: 'Ada Lovelace' }],
        total: 1,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the report is missing', async () => {
      reportsRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(user, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(reportsRepository.findById).toHaveBeenCalledWith('b1', 'missing');
    });

    it('returns the report enriched with the creator name', async () => {
      reportsRepository.findById.mockResolvedValue(report);
      reportsRepository.resolveCreatorNames.mockResolvedValue(
        new Map([['u1', 'Ada Lovelace']]),
      );

      const result = await service.findOne(user, 'r1');

      expect(result).toEqual({ ...report, createdByName: 'Ada Lovelace' });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the report is missing', async () => {
      reportsRepository.findById.mockResolvedValue(null);

      await expect(service.remove(user, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes the report and returns a confirmation', async () => {
      reportsRepository.findById.mockResolvedValue(report);

      const result = await service.remove(user, 'r1');

      expect(reportsRepository.remove).toHaveBeenCalledWith(report);
      expect(result).toEqual({ message: 'Report deleted successfully' });
    });
  });
});
