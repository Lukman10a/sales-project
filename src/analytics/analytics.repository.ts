import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';

export type AnalyticsPeriod = 'today' | 'week' | 'month';
export type BucketUnit = 'hour' | 'day' | 'week';

export interface AnalyticsSummaryRow {
  revenue: number;
  orders: number;
  netProfit: number;
}

export interface TimeSeriesRow {
  bucket: Date;
  revenue: number;
  orders: number;
}

export interface CategoryRow {
  category: string;
  revenue: number;
  units: number;
  orders: number;
}

export interface TopProductRow {
  productId: string;
  name: string;
  units: number;
  revenue: number;
}

export interface RecentSaleRow {
  id: string;
  total: number;
  status: Sale['status'];
  saleDate: Date;
  customerName?: string;
  paymentMethod: Sale['paymentMethod'];
}

export interface InventoryBreakdown {
  totalProducts: number;
  byStatus: Record<InventoryItem['status'], number>;
  lowStockItems: InventoryItem[];
}

const LOW_STOCK_ALERT_LIMIT = 10;

@Injectable()
export class AnalyticsRepository extends Repository<Sale> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super(Sale, dataSource.createEntityManager());
  }

  transaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }

  async summary(
    businessId: string,
    from?: Date,
    to?: Date,
  ): Promise<AnalyticsSummaryRow> {
    const qb = this.createQueryBuilder('s')
      .innerJoin(SaleItem, 'si', 'si.saleId = s.id')
      .leftJoin(
        InventoryItem,
        'ii',
        'ii.id = si.productId AND ii.businessId = :businessId',
      )
      .select('COALESCE(SUM(si.price * si.quantity), 0)', 'revenue')
      .addSelect('COUNT(DISTINCT s.id)', 'orders')
      .addSelect(
        'COALESCE(SUM((si.price - COALESCE(ii.wholesalePrice, 0)) * si.quantity), 0)',
        'netProfit',
      )
      .where('s.businessId = :businessId', { businessId })
      .andWhere("s.status = 'completed'");

    if (from && to) {
      qb.andWhere('s.createdAt BETWEEN :from AND :to', { from, to });
    }

    const raw = await qb.getRawOne<{
      revenue: string;
      orders: string;
      netProfit: string;
    }>();

    return {
      revenue: Number(raw?.revenue ?? 0),
      orders: Number(raw?.orders ?? 0),
      netProfit: Number(raw?.netProfit ?? 0),
    };
  }

  async timeSeries(
    businessId: string,
    from: Date,
    to: Date,
    unit: BucketUnit,
  ): Promise<TimeSeriesRow[]> {
    const truncExpr =
      unit === 'hour'
        ? "date_trunc('hour', s.createdAt)"
        : unit === 'day'
          ? "date_trunc('day', s.createdAt)"
          : "date_trunc('week', s.createdAt)";

    const qb = this.createQueryBuilder('s')
      .innerJoin(SaleItem, 'si', 'si.saleId = s.id')
      .select(truncExpr, 'bucket')
      .addSelect('SUM(si.price * si.quantity)', 'revenue')
      .addSelect('COUNT(DISTINCT s.id)', 'orders')
      .where('s.businessId = :businessId', { businessId })
      .andWhere("s.status = 'completed'")
      .andWhere('s.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy(truncExpr)
      .orderBy('bucket', 'ASC');

    const raw = await qb.getRawMany<{
      bucket: Date;
      revenue: string;
      orders: string;
    }>();

    return raw.map((row) => ({
      bucket: new Date(row.bucket),
      revenue: Number(row.revenue),
      orders: Number(row.orders),
    }));
  }

  async categoryBreakdown(
    businessId: string,
    from: Date,
    to: Date,
  ): Promise<CategoryRow[]> {
    const qb = this.createQueryBuilder('s')
      .innerJoin(SaleItem, 'si', 'si.saleId = s.id')
      .innerJoin(
        InventoryItem,
        'ii',
        'ii.id = si.productId AND ii.businessId = :businessId',
      )
      .select('unnest(ii.category)', 'category')
      .addSelect('SUM(si.quantity)', 'units')
      .addSelect('SUM(si.price * si.quantity)', 'revenue')
      .addSelect('COUNT(DISTINCT s.id)', 'orders')
      .where('s.businessId = :businessId', { businessId })
      .andWhere("s.status = 'completed'")
      .andWhere('s.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('category')
      .orderBy('revenue', 'DESC');

    const raw = await qb.getRawMany<{
      category: string;
      units: string;
      revenue: string;
      orders: string;
    }>();

    return raw.map((row) => ({
      category: row.category,
      units: Number(row.units),
      revenue: Number(row.revenue),
      orders: Number(row.orders),
    }));
  }

  async topProducts(
    businessId: string,
    from?: Date,
    to?: Date,
    limit = 10,
  ): Promise<TopProductRow[]> {
    const qb = this.createQueryBuilder('s')
      .innerJoin(SaleItem, 'si', 'si.saleId = s.id')
      .innerJoin(
        InventoryItem,
        'ii',
        'ii.id = si.productId AND ii.businessId = :businessId',
      )
      .select('ii.id', 'productId')
      .addSelect('ii.name', 'name')
      .addSelect('SUM(si.quantity)', 'units')
      .addSelect('SUM(si.price * si.quantity)', 'revenue')
      .where('s.businessId = :businessId', { businessId })
      .andWhere("s.status = 'completed'")
      .groupBy('ii.id')
      .addGroupBy('ii.name')
      .orderBy('revenue', 'DESC')
      .limit(limit);

    if (from && to) {
      qb.andWhere('s.createdAt BETWEEN :from AND :to', { from, to });
    }

    const raw = await qb.getRawMany<{
      productId: string;
      name: string;
      units: string;
      revenue: string;
    }>();

    return raw.map((row) => ({
      productId: row.productId,
      name: row.name,
      units: Number(row.units),
      revenue: Number(row.revenue),
    }));
  }

  async recentSales(businessId: string, limit = 5): Promise<RecentSaleRow[]> {
    const raw = await this.createQueryBuilder('s')
      .select('s.id', 'id')
      .addSelect('s.total', 'total')
      .addSelect('s.status', 'status')
      .addSelect('s.saleDate', 'saleDate')
      .addSelect('s.customerName', 'customerName')
      .addSelect('s.paymentMethod', 'paymentMethod')
      .where('s.businessId = :businessId', { businessId })
      .orderBy('s.createdAt', 'DESC')
      .limit(limit)
      .getRawMany<{
        id: string;
        total: string;
        status: string;
        saleDate: Date;
        customerName?: string | null;
        paymentMethod: string;
      }>();

    return raw.map((row) => ({
      id: row.id,
      total: Number(row.total),
      status: row.status as Sale['status'],
      saleDate: new Date(row.saleDate),
      customerName: row.customerName ?? undefined,
      paymentMethod: row.paymentMethod as Sale['paymentMethod'],
    }));
  }

  async inventoryBreakdown(businessId: string): Promise<InventoryBreakdown> {
    const counts = await this.manager
      .createQueryBuilder(InventoryItem, 'item')
      .select('item.status', 'status')
      .addSelect('COUNT(item.id)', 'count')
      .where('item.businessId = :businessId', { businessId })
      .groupBy('item.status')
      .getRawMany<{ status: InventoryItem['status']; count: string }>();

    const byStatus: Record<InventoryItem['status'], number> = {
      'in-stock': 0,
      'low-stock': 0,
      'out-of-stock': 0,
    };
    for (const row of counts) {
      byStatus[row.status] = Number(row.count);
    }

    const lowStockItems = await this.manager
      .createQueryBuilder(InventoryItem, 'item')
      .where('item.businessId = :businessId', { businessId })
      .andWhere('item.status IN (:...statuses)', {
        statuses: ['low-stock', 'out-of-stock'],
      })
      .orderBy('item.quantity', 'ASC')
      .limit(LOW_STOCK_ALERT_LIMIT)
      .getMany();

    return {
      totalProducts: Object.values(byStatus).reduce(
        (sum, count) => sum + count,
        0,
      ),
      byStatus,
      lowStockItems,
    };
  }
}
