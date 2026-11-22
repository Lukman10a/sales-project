import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  TransactionalRepository,
  activeManager,
} from '../common/transactions/transactions';
import { assertTenant } from '../common/tenancy/assert-tenant';
import { InventoryItem } from '../entities/inventory-item.entity';
import {
  StockMovement,
  type StockReason,
} from '../entities/stock-movement.entity';

export interface StockChange {
  delta: number;
  reason: StockReason;
  refId?: string | null;
  actorUserId?: string | null;
  note?: string | null;
  /** Units added to (sale) or taken off (refund) the product's sold count. */
  soldDelta?: number;
}

export interface LedgerMismatch {
  businessId: string;
  productId: string;
  name: string;
  quantity: number;
  ledger: number;
}

/** Thrown when a change would take stock below zero (or the product is gone). */
export class NegativeStockError extends Error {
  constructor(name: string) {
    super(`Stock for ${name} cannot go below zero`);
    this.name = 'NegativeStockError';
  }
}

/**
 * The stock ledger (T36). `move` is the only way a product's quantity
 * changes: it updates the row and appends the movement in the same
 * transaction, so quantity always equals the sum of the movements. Rows are
 * never updated or deleted (the database refuses both).
 */
@Injectable()
export class StockLedgerRepository extends TransactionalRepository<StockMovement> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(StockMovement, dataSource.createEntityManager());
  }

  /**
   * Applies a change to a product. The update is relative and guarded
   * (`quantity + delta >= 0`), so concurrent moves never lose one another
   * even where the caller has not locked the row. The product passed in is
   * refreshed with the stored values.
   */
  async move(
    businessId: string,
    product: InventoryItem,
    change: StockChange,
  ): Promise<InventoryItem> {
    assertTenant(businessId, product);
    const manager = activeManager();
    if (!manager) {
      throw new Error('Stock moves must run inside a transaction');
    }
    if (!Number.isInteger(change.delta) || change.delta === 0) {
      throw new Error('A stock move needs a non-zero whole delta');
    }
    const result: unknown = await manager.query(
      `UPDATE "inventory_items" SET
         "quantity" = "quantity" + $3,
         "sold" = GREATEST(0, "sold" + $4),
         "status" = (CASE
           WHEN "quantity" + $3 <= 0 THEN 'out-of-stock'
           WHEN "reorderPoint" IS NOT NULL AND "quantity" + $3 <= "reorderPoint" THEN 'low-stock'
           ELSE 'in-stock' END)::"inventory_items_status_enum",
         "lastRestocked" = CASE WHEN $5::boolean THEN CURRENT_DATE ELSE "lastRestocked" END,
         "updatedAt" = now()
       WHERE "id" = $1 AND "businessId" = $2 AND "quantity" + $3 >= 0
       RETURNING "quantity", "sold", "status"`,
      [
        product.id,
        businessId,
        change.delta,
        change.soldDelta ?? 0,
        change.reason === 'restock',
      ],
    );
    const rows = (
      Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result
    ) as Array<Pick<InventoryItem, 'quantity' | 'sold' | 'status'>>;
    if (!rows.length) throw new NegativeStockError(product.name);
    Object.assign(product, rows[0]);
    await manager.insert(StockMovement, {
      businessId,
      productId: product.id,
      delta: change.delta,
      reason: change.reason,
      refId: change.refId ?? null,
      actorUserId: change.actorUserId ?? null,
      note: change.note ?? null,
    });
    return product;
  }

  /** A product's movements, newest first. */
  history(
    businessId: string,
    productId: string,
    limit: number,
  ): Promise<StockMovement[]> {
    return this.manager.find(StockMovement, {
      where: { businessId, productId },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit,
    });
  }

  /** Products whose quantity is not the sum of their ledger, all businesses. */
  async mismatches(businessId?: string): Promise<LedgerMismatch[]> {
    const rows = await this.manager.query<
      Array<{
        businessId: string;
        productId: string;
        name: string;
        quantity: number;
        ledger: string;
      }>
    >(
      `SELECT p."businessId", p."id" AS "productId", p."name", p."quantity",
              COALESCE(SUM(m."delta"), 0)::bigint AS "ledger"
       FROM "inventory_items" p
       LEFT JOIN "stock_movements" m
         ON m."productId" = p."id" AND m."businessId" = p."businessId"
       WHERE ($1::uuid IS NULL OR p."businessId" = $1::uuid)
       GROUP BY p."id"
       HAVING p."quantity" <> COALESCE(SUM(m."delta"), 0)`,
      [businessId ?? null],
    );
    return rows.map((r) => ({ ...r, ledger: Number(r.ledger) }));
  }
}
