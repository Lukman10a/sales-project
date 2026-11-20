import { nairaSql } from '../common/money/money';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { HeldTransaction } from '../entities/held-transaction.entity';
import { IdempotencyKey } from '../entities/idempotency-key.entity';
import { User } from '../entities/user.entity';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { assertTenant } from '../common/tenancy/assert-tenant';
import {
  TransactionalRepository,
  runInTransaction,
} from '../common/transactions/transactions';
import { IDEMPOTENCY_TTL_HOURS } from './idempotency';

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

/** The unit of work a sale runs in, as handed to `transaction()` callbacks. */
export type SalesTx = EntityManager;

export type IdempotencyClaim =
  | { claimed: true }
  | { claimed: false; requestHash: string; saleId: string | null };

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

  /**
   * Locks the business's products for the rest of the transaction, in id
   * order so two tills locking the same products cannot deadlock.
   */
  lockProducts(
    businessId: string,
    manager: EntityManager,
    ids: string[],
  ): Promise<InventoryItem[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return manager
      .createQueryBuilder(InventoryItem, 'p')
      .setLock('pessimistic_write')
      .where('p.businessId = :businessId', { businessId })
      .andWhere('p.id IN (:...ids)', { ids: [...ids].sort() })
      .orderBy('p.id', 'ASC')
      .getMany();
  }

  /** Current catalogue rows, without locking (held sales re-price from these). */
  findProducts(businessId: string, ids: string[]): Promise<InventoryItem[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.manager.find(InventoryItem, {
      where: { businessId, id: In(ids) },
    });
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

  /** Whether the business charges VAT (a setting on the owner's row). */
  async vatEnabled(
    businessId: string,
    manager: EntityManager = this.manager,
  ): Promise<boolean> {
    const owner = await manager.findOne(User, {
      where: { id: businessId },
      select: ['id', 'vatEnabled'],
    });
    return owner?.vatEnabled ?? false;
  }

  async setVatEnabled(businessId: string, enabled: boolean): Promise<void> {
    await this.manager.update(
      User,
      { id: businessId },
      { vatEnabled: enabled },
    );
  }

  /**
   * The next receipt number. The counter row stays locked until the sale
   * commits, so numbers are gap-free and never shared.
   */
  async nextReceiptNumber(
    businessId: string,
    manager: EntityManager,
  ): Promise<number> {
    const rows: Array<{ lastNumber: number }> = await manager.query(
      `INSERT INTO "receipt_counters" ("businessId", "lastNumber") VALUES ($1, 1)
       ON CONFLICT ("businessId") DO UPDATE
         SET "lastNumber" = "receipt_counters"."lastNumber" + 1
       RETURNING "lastNumber"`,
      [businessId],
    );
    return Number(rows[0].lastNumber);
  }

  /**
   * Claims an Idempotency-Key for this transaction. A key still in use by a
   * concurrent request blocks here until that request commits or rolls back.
   * An expired key is taken over.
   */
  async claimIdempotencyKey(
    businessId: string,
    manager: EntityManager,
    key: string,
    requestHash: string,
  ): Promise<IdempotencyClaim> {
    const claimed: unknown[] = await manager.query(
      `INSERT INTO "idempotency_keys" ("businessId", "key", "requestHash", "expiresAt")
       VALUES ($1, $2, $3, now() + interval '${IDEMPOTENCY_TTL_HOURS} hours')
       ON CONFLICT ("businessId", "key") DO UPDATE
         SET "requestHash" = EXCLUDED."requestHash", "saleId" = NULL,
             "createdAt" = now(), "expiresAt" = EXCLUDED."expiresAt"
         WHERE "idempotency_keys"."expiresAt" <= now()
       RETURNING "key"`,
      [businessId, key, requestHash],
    );
    if (claimed.length > 0) return { claimed: true };
    const existing = await manager.findOneOrFail(IdempotencyKey, {
      where: { businessId, key },
    });
    return {
      claimed: false,
      requestHash: existing.requestHash,
      saleId: existing.saleId,
    };
  }

  async completeIdempotencyKey(
    businessId: string,
    manager: EntityManager,
    key: string,
    saleId: string,
  ): Promise<void> {
    await manager.update(IdempotencyKey, { businessId, key }, { saleId });
  }

  createSale(
    businessId: string,
    manager: EntityManager,
    data: {
      receiptNumber: number;
      subtotal: number;
      discountAmount: number;
      vatAmount: number;
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
        productName: string;
        unit: SaleItem['unit'];
        quantity: number;
        unitsPerItem: number;
        price: number;
        total: number;
      }>;
    },
  ): Promise<Sale> {
    const sale = manager.create(Sale, {
      ...data,
      businessId,
      items: data.items.map((item) => manager.create(SaleItem, item)),
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

  /** Locks the sale row (so refunds of one sale run one at a time), then loads its lines. */
  async lockSale(
    businessId: string,
    manager: EntityManager,
    id: string,
  ): Promise<Sale | null> {
    const sale = await manager
      .createQueryBuilder(Sale, 'sale')
      .setLock('pessimistic_write')
      .where('sale.id = :id', { id })
      .andWhere('sale.businessId = :businessId', { businessId })
      .getOne();
    if (!sale) return null;
    sale.items = await manager.find(SaleItem, {
      where: { saleId: sale.id },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return sale;
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

  /** A cashier sees only the sales they parked themselves. */
  async listHeld(
    businessId: string,
    heldBy: string,
  ): Promise<HeldTransaction[]> {
    return this.manager
      .createQueryBuilder(HeldTransaction, 'held')
      .where('held.businessId = :businessId', { businessId })
      .andWhere('held.heldBy = :heldBy', { heldBy })
      .andWhere('held.expiresAt > :now', { now: new Date() })
      .orderBy('held.createdAt', 'DESC')
      .getMany();
  }

  async findHeld(
    businessId: string,
    heldBy: string,
    id: string,
  ): Promise<HeldTransaction | null> {
    return this.manager.findOne(HeldTransaction, {
      where: { id, businessId, heldBy },
    });
  }

  createHeld(
    businessId: string,
    data: {
      customerName: string;
      items: HeldTransaction['items'];
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
