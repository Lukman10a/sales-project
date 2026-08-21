import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Report } from '../entities/report.entity';
import { User } from '../entities/user.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';

export interface ReportsListResult {
  data: Report[];
  total: number;
  page: number;
  limit: number;
}

export interface ProfitSummary {
  revenue: number;
  orders: number;
  netProfit: number;
}

@Injectable()
export class ReportsRepository {
  constructor(
    @InjectRepository(Report)
    private readonly repository: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(entity: Partial<Report>): Promise<Report> {
    const report = this.repository.create(entity);
    return this.repository.save(report);
  }

  async list(
    businessId: string,
    page: number,
    limit: number,
  ): Promise<ReportsListResult> {
    const [data, total] = await this.repository
      .createQueryBuilder('report')
      .where('report.businessId = :businessId', { businessId })
      .orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  findById(businessId: string, id: string): Promise<Report | null> {
    return this.repository.findOne({ where: { id, businessId } });
  }

  async remove(report: Report): Promise<void> {
    await this.repository.remove(report);
  }

  async resolveCreatorNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();

    const users = await this.userRepository.find({
      where: { id: In(ids) },
      select: ['id', 'firstName', 'lastName'],
    });

    return new Map(
      users.map((user) => [user.id, `${user.firstName} ${user.lastName}`]),
    );
  }

  async profitSummary(
    businessId: string,
    from: string,
    to: string,
  ): Promise<ProfitSummary> {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const raw = await this.repository.manager
      .createQueryBuilder(Sale, 's')
      .innerJoin(SaleItem, 'si', 'si.saleId = s.id')
      .leftJoin(
        InventoryItem,
        'ii',
        'ii.id = si.productId AND ii.businessId = :businessId',
        { businessId },
      )
      .select('COALESCE(SUM(si.price * si.quantity), 0)', 'revenue')
      .addSelect('COUNT(DISTINCT s.id)', 'orders')
      .addSelect(
        'COALESCE(SUM((si.price - COALESCE(ii.wholesalePrice, 0)) * si.quantity), 0)',
        'netProfit',
      )
      .where('s.businessId = :businessId', { businessId })
      .andWhere("s.status = 'completed'")
      .andWhere('s.createdAt BETWEEN :from AND :to', {
        from: fromDate,
        to: toDate,
      })
      .getRawOne<{ revenue: string; orders: string; netProfit: string }>();

    return {
      revenue: Number(raw?.revenue ?? 0),
      orders: Number(raw?.orders ?? 0),
      netProfit: Number(raw?.netProfit ?? 0),
    };
  }
}
