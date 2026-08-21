import { Injectable, NotFoundException } from '@nestjs/common';
import type { Report } from '../entities/report.entity';
import type { CreateReportDto } from './dto/create-report.dto';
import { ReportsRepository } from './reports.repository';
import { SalesRepository } from '../sales/sales.repository';
import { InventoryRepository } from '../inventory/inventory.repository';

@Injectable()
export class ReportsService {
  constructor(
    private reportsRepository: ReportsRepository,
    private salesRepository: SalesRepository,
    private inventoryRepository: InventoryRepository,
  ) {}

  async generate(
    user: { id: string; businessId: string },
    dto: CreateReportDto,
  ): Promise<Report> {
    const snapshot = await this.buildSnapshot(user.businessId, dto);

    return this.reportsRepository.create({
      businessId: user.businessId,
      name: dto.name,
      type: dto.type,
      format: dto.format,
      dateRange: dto.dateRange,
      status: 'completed',
      snapshot,
      createdBy: user.id,
    });
  }

  async list(
    user: { businessId: string },
    query: { page: number; limit: number },
  ) {
    const result = await this.reportsRepository.list(
      user.businessId,
      query.page,
      query.limit,
    );

    const data = await this.enrichCreators(result.data);

    return { ...result, data };
  }

  async findOne(
    user: { businessId: string },
    id: string,
  ): Promise<Report & { createdByName?: string }> {
    const report = await this.reportsRepository.findById(user.businessId, id);
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    const [enriched] = await this.enrichCreators([report]);
    return enriched;
  }

  async remove(
    user: { businessId: string },
    id: string,
  ): Promise<{ message: string }> {
    const report = await this.reportsRepository.findById(user.businessId, id);
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    await this.reportsRepository.remove(report);
    return { message: 'Report deleted successfully' };
  }

  private async buildSnapshot(
    businessId: string,
    dto: CreateReportDto,
  ): Promise<Record<string, unknown>> {
    switch (dto.type) {
      case 'sales':
        return this.buildSalesSnapshot(businessId, dto.dateRange);
      case 'inventory':
        return this.buildInventorySnapshot(businessId);
      default:
        return this.buildProfitSnapshot(businessId, dto.dateRange);
    }
  }

  private async buildSalesSnapshot(
    businessId: string,
    dateRange: { start: string; end: string },
  ): Promise<Record<string, unknown>> {
    const { data, summary } = await this.salesRepository.list({
      businessId,
      page: 1,
      limit: 100,
      dateFrom: dateRange.start,
      dateTo: dateRange.end,
    });

    return {
      type: 'sales',
      dateRange,
      summary,
      items: data.map((sale) => ({
        id: sale.id,
        saleDate: sale.saleDate,
        total: Number(sale.total),
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        customerName: sale.customerName ?? null,
      })),
    };
  }

  private async buildInventorySnapshot(
    businessId: string,
  ): Promise<Record<string, unknown>> {
    const { data } = await this.inventoryRepository.list({
      businessId,
      page: 1,
      limit: 1000,
    });

    return {
      type: 'inventory',
      items: data.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        sku: item.sku ?? null,
        quantity: item.quantity,
        sellingPrice: Number(item.sellingPrice),
        wholesalePrice: Number(item.wholesalePrice),
        status: item.status,
      })),
    };
  }

  private async buildProfitSnapshot(
    businessId: string,
    dateRange: { start: string; end: string },
  ): Promise<Record<string, unknown>> {
    const summary = await this.reportsRepository.profitSummary(
      businessId,
      dateRange.start,
      dateRange.end,
    );

    return { type: 'profit', dateRange, summary };
  }

  private async enrichCreators(
    reports: Report[],
  ): Promise<Array<Report & { createdByName?: string }>> {
    if (reports.length === 0) return reports;

    const ids = [
      ...new Set(
        reports
          .map((report) => report.createdBy)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const names = await this.reportsRepository.resolveCreatorNames(ids);

    return reports.map((report) => ({
      ...report,
      createdByName: report.createdBy ? names.get(report.createdBy) : undefined,
    }));
  }
}
