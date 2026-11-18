import { nairaSql } from '../common/money/money';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { HeldTransaction } from '../entities/held-transaction.entity';
import { User } from '../entities/user.entity';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { assertTenant } from '../common/tenancy/assert-tenant';
import {
  TransactionalRepository,
  runInTransaction,
} from '../common/transactions/transactions';

export interface SalesListQuery {
  page: number;
  limit: number;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  status?: string;
}

export interface SalesSummary {
  totalSales: number;
  totalTransactions: number;
  averageTransaction: number;
}

export interface SalesListResult extends PaginatedResult<Sale> {
  summary: SalesSummary;
}

/** A held (parked) sale stays retrievable for a day. */
export const HELD_TTL_MS = 24 * 60 * 60 * 1000;

/** Tenant-owned: every method takes `businessId` first. */
@Injectable()
export class SalesRepository extends TransactionalRepository<Sale> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super(Sale, dataSource.createEntityManager());
  }

  /** Joins the surrounding unit of work, so audit events share it. */
  transaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return runInTransaction(this.dataSource, fn);
  }

  async findProduct(
    businessId: string,
    manager: EntityManager,
    id: string,
  ): Promise<InventoryItem | null> {
    return manager.findOne(InventoryItem, { where: { id, businessId } });
  }

  saveProduct(
    businessId: string,
    manager: EntityManager,
    product: InventoryItem,
  ): Promise<InventoryItem> {
    assertTenant(businessId, product);
    return manager.save(product);
  }

  saveSale(businessId: string, manager: EntityManager, sale: Sale) {
    assertTenant(businessId, sale);
    return manager.save(sale);
  }

  createSale(
    businessId: string,
    manager: EntityManager,
    data: {
      total: number;
      paymentMethod: Sale['paymentMethod'];
      status: 'completed';
      saleDate: Date;
      soldBy: string;
      customerId?: string;
      customerName?: string;
      discountPercent: number;
      splitPayments?: Sale['splitPayments'];
      loyaltyPointsUsed?: number;
      accountCredit?: number;
      items: Array<{
        productId: string;
        quantity: number;
        price: number;
        productName: string;
      }>;
    },
  ): Promise<Sale> {
    const sale = manager.create(Sale, {
      ...data,
      businessId,
      items: data.items.map((item) =>
        manager.create(SaleItem, {
          ...item,
          total: Number(item.price) * item.quantity,
        }),
      ),
    });
    return manager.save(sale);
  }

  findSaleWithItems(
    businessId: string,
    manager: EntityManager,
    id: string,
  ): Promise<Sale | null> {
    return manager.findOne(Sale, {
      where: { id, businessId },
      relations: ['items'],
    });
  }

  async resolveSellerNames(
    businessId: string,
    ids: string[],
  ): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();

    const users = await this.manager.find(User, {
      where: { id: In(ids), businessId },
      select: ['id', 'firstName', 'lastName'],
    });

    return new Map(
      users.map((user) => [user.id, `${user.firstName} ${user.lastName}`]),
    );
  }

  async findSaleWithItemsDirect(
    businessId: string,
    id: string,
  ): Promise<Sale | null> {
    return this.findOne({
      where: { id, businessId },
      relations: ['items'],
    });
  }

  async list(
    businessId: string,
    query: SalesListQuery,
  ): Promise<SalesListResult> {
    const { page, limit, dateFrom, dateTo, paymentMethod, status } = query;

    const qb = this.createQueryBuilder('sale').where(
      'sale.businessId = :businessId',
      { businessId },
    );

    if (dateFrom) {
      qb.andWhere('sale.saleDate >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('sale.saleDate <= :dateTo', { dateTo });
    }
    if (paymentMethod) {
      qb.andWhere('sale.paymentMethod = :paymentMethod', { paymentMethod });
    }
    if (status) {
      qb.andWhere('sale.status = :status', { status });
    }

    qb.orderBy('sale.saleDate', 'DESC');
    qb.loadRelationCountAndMap('sale.itemCount', 'sale.items');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const summary = await this.computeSummary(businessId, {
      dateFrom,
      dateTo,
      paymentMethod,
      status,
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  private async computeSummary(
    businessId: string,
    query: Omit<SalesListQuery, 'page' | 'limit'>,
  ): Promise<SalesSummary> {
    const { dateFrom, dateTo, paymentMethod, status } = query;

    const qb = this.createQueryBuilder('sale').where(
      'sale.businessId = :businessId',
      { businessId },
    );

    if (dateFrom) {
      qb.andWhere('sale.saleDate >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('sale.saleDate <= :dateTo', { dateTo });
    }
    if (paymentMethod) {
      qb.andWhere('sale.paymentMethod = :paymentMethod', { paymentMethod });
    }
    if (status) {
      qb.andWhere('sale.status = :status', { status });
    }

    qb.select(nairaSql('SUM(sale.total)'), 'totalSales')
      .addSelect('COUNT(sale.id)', 'totalTransactions')
      .where('sale.businessId = :businessId', { businessId })
      .andWhere("sale.status != 'refunded'");

    const raw = await qb.getRawOne<{
      totalSales: string | null;
      totalTransactions: string | null;
    }>();

    const totalSales = Number(raw?.totalSales ?? 0);
    const totalTransactions = Number(raw?.totalTransactions ?? 0);
    const averageTransaction =
      totalTransactions > 0 ? totalSales / totalTransactions : 0;

    return {
      totalSales,
      totalTransactions,
      averageTransaction,
    };
  }

  async listHeld(businessId: string): Promise<HeldTransaction[]> {
    return this.manager
      .createQueryBuilder(HeldTransaction, 'held')
      .where('held.businessId = :businessId', { businessId })
      .andWhere('held.expiresAt > :now', { now: new Date() })
      .orderBy('held.createdAt', 'DESC')
      .getMany();
  }

  async findHeld(
    businessId: string,
    id: string,
  ): Promise<HeldTransaction | null> {
    return this.manager.findOne(HeldTransaction, {
      where: { id, businessId },
    });
  }

  createHeld(
    businessId: string,
    data: {
      customerName: string;
      items: Array<{ productId: string; quantity: number; price: number }>;
      heldBy: string;
      discountPercent: number;
      paymentMethod: Sale['paymentMethod'];
    },
  ): Promise<HeldTransaction> {
    // Set here: the column default cannot express "24 hours from now".
    const held = this.manager.create(HeldTransaction, {
      ...data,
      businessId,
      expiresAt: new Date(Date.now() + HELD_TTL_MS),
    });
    return this.manager.save(held);
  }

  async removeHeld(businessId: string, held: HeldTransaction) {
    assertTenant(businessId, held);
    await this.manager.remove(held);
  }
}
