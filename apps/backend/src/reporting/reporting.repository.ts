import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { fromKobo } from '../common/money/money';
import { BUSINESS_TIMEZONE } from '../common/time/business-day';
import type { DayRange } from './periods';

/**
 * Report aggregates in SQL, over Lagos business days (`sales.saleDate`).
 *
 * Definitions (all kobo in SQL, naira out):
 * - sales: what was sold, excluding VAT, after discounts and refunds. For a
 *   sale: (total - VAT) * (total - refunded) / total.
 * - cost of goods sold (COGS): units kept by the customer times the cost per
 *   unit recorded on the sale line.
 * - items sold: stock units kept by the customer.
 * Pending sales are left out; a fully refunded sale adds nothing.
 */
export interface PeriodTotals {
  sales: number;
  cogs: number;
  itemsSold: number;
  /** Sales not fully refunded. */
  saleCount: number;
  /** People who recorded at least one sale. */
  staffCount: number;
}

export interface DayTotals {
  date: string;
  sales: number;
  cogs: number;
}

export interface ProductTotals {
  productId: string;
  name: string;
  units: number;
  revenue: number;
  cogs: number;
}

export interface PaymentTotals {
  method: string;
  /** Takings including VAT, after refunds. */
  amount: number;
  saleCount: number;
}

const COUNTED = `('completed', 'partial-refund', 'refunded')`;

/** $1 businessId, $2 from, $3 to, and $4 an optional Lagos time-of-day cutoff. */
function saleFilter(alias: string, withCutoff: boolean): string {
  return [
    `${alias}."businessId" = $1`,
    `${alias}."saleDate" BETWEEN $2 AND $3`,
    `${alias}."status" IN ${COUNTED}`,
    withCutoff
      ? `(${alias}."createdAt" AT TIME ZONE '${BUSINESS_TIMEZONE}')::time <= $4::time`
      : 'TRUE',
  ].join(' AND ');
}

/** A sale's sales figure (kobo, numeric). */
const NET_SALES = `COALESCE(
  (s."total" - s."vatAmount")::numeric * (s."total" - COALESCE(s."refundAmount", 0)) / NULLIF(s."total", 0),
  0)`;
/** Units a line's customer kept. */
const KEPT = `(si."quantity" - si."refundedQuantity")::bigint * si."unitsPerItem"`;

const kobo = (v: string | number | null | undefined) =>
  fromKobo(String(Math.round(Number(v ?? 0))));

@Injectable()
export class ReportingRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private query<T>(sql: string, params: unknown[]): Promise<T[]> {
    return this.dataSource.query<T[]>(sql, params);
  }

  async totals(
    businessId: string,
    range: DayRange,
    cutoff?: string,
  ): Promise<PeriodTotals> {
    const params = [
      businessId,
      range.from,
      range.to,
      ...(cutoff ? [cutoff] : []),
    ];
    const where = saleFilter('s', Boolean(cutoff));
    const [row] = await this.query<{
      sales: string;
      sale_count: string;
      staff: string;
      units: string;
      cogs: string;
    }>(
      `WITH picked AS (
         SELECT s."id", s."soldBy", s."status", ${NET_SALES} AS net
         FROM "sales" s WHERE ${where}
       ),
       kept AS (
         SELECT COALESCE(SUM(${KEPT}), 0) AS units,
                COALESCE(SUM(${KEPT} * si."unitCost"), 0) AS cogs
         FROM "sale_items" si JOIN picked p ON p."id" = si."saleId"
       )
       SELECT COALESCE(SUM(p.net), 0)::text AS sales,
              COUNT(*) FILTER (WHERE p."status" <> 'refunded')::text AS sale_count,
              COUNT(DISTINCT p."soldBy")::text AS staff,
              (SELECT units FROM kept)::text AS units,
              (SELECT cogs FROM kept)::text AS cogs
       FROM picked p`,
      params,
    );
    return {
      sales: kobo(row?.sales),
      cogs: kobo(row?.cogs),
      itemsSold: Number(row?.units ?? 0),
      saleCount: Number(row?.sale_count ?? 0),
      staffCount: Number(row?.staff ?? 0),
    };
  }

  /** One row per day in the range, zero-filled. */
  async daily(businessId: string, range: DayRange): Promise<DayTotals[]> {
    const rows = await this.query<{ day: string; sales: string; cogs: string }>(
      `WITH picked AS (
         SELECT s."id", s."saleDate", ${NET_SALES} AS net
         FROM "sales" s WHERE ${saleFilter('s', false)}
       ),
       by_day AS (
         SELECT p."saleDate" AS day, SUM(p.net) AS sales FROM picked p GROUP BY 1
       ),
       cost_by_day AS (
         SELECT p."saleDate" AS day, SUM(${KEPT} * si."unitCost") AS cogs
         FROM "sale_items" si JOIN picked p ON p."id" = si."saleId" GROUP BY 1
       )
       SELECT to_char(d, 'YYYY-MM-DD') AS day,
              COALESCE(b.sales, 0)::text AS sales,
              COALESCE(c.cogs, 0)::text AS cogs
       FROM generate_series($2::date, $3::date, interval '1 day') AS d
       LEFT JOIN by_day b ON b.day = d::date
       LEFT JOIN cost_by_day c ON c.day = d::date
       ORDER BY d`,
      [businessId, range.from, range.to],
    );
    return rows.map((r) => ({
      date: r.day,
      sales: kobo(r.sales),
      cogs: kobo(r.cogs),
    }));
  }

  async topProducts(
    businessId: string,
    range: DayRange,
    by: 'units' | 'revenue',
    limit: number,
  ): Promise<ProductTotals[]> {
    // Numeric columns (pg sends them as strings), so these sort as numbers.
    const order = by === 'units' ? 'units' : 'revenue';
    const rows = await this.query<{
      product_id: string;
      name: string;
      units: string;
      revenue: string;
      cogs: string;
    }>(
      `SELECT si."productId" AS product_id,
              (array_agg(si."productName" ORDER BY s."createdAt" DESC))[1] AS name,
              SUM(${KEPT}) AS units,
              COALESCE(SUM(
                (si."quantity" - si."refundedQuantity")::numeric * si."price"
                * (s."subtotal" - s."discountAmount") / NULLIF(s."subtotal", 0)
              ), 0) AS revenue,
              SUM(${KEPT} * si."unitCost") AS cogs
       FROM "sale_items" si JOIN "sales" s ON s."id" = si."saleId"
       WHERE ${saleFilter('s', false)}
       GROUP BY si."productId"
       HAVING SUM(${KEPT}) > 0
       ORDER BY ${order} DESC, name
       LIMIT $4`,
      [businessId, range.from, range.to, limit],
    );
    return rows.map((r) => ({
      productId: r.product_id,
      name: r.name,
      units: Number(r.units),
      revenue: kobo(r.revenue),
      cogs: kobo(r.cogs),
    }));
  }

  /** Takings by payment method; split payments count under each part. */
  async paymentMethods(
    businessId: string,
    range: DayRange,
  ): Promise<PaymentTotals[]> {
    const where = `${saleFilter('s', false)} AND s."status" <> 'refunded'`;
    const kept = `(s."total" - COALESCE(s."refundAmount", 0))::numeric`;
    const rows = await this.query<{
      method: string;
      amount: string;
      sales: string;
    }>(
      `SELECT method, SUM(amount)::text AS amount, COUNT(DISTINCT id)::text AS sales
       FROM (
         SELECT s."id", s."paymentMethod"::text AS method, ${kept} AS amount
         FROM "sales" s WHERE ${where} AND s."paymentMethod" <> 'split'
         UNION ALL
         SELECT s."id", part->>'method', (part->>'amount')::numeric * ${kept} / NULLIF(s."total", 0)
         FROM "sales" s,
              jsonb_array_elements(COALESCE(s."splitPayments", '[]'::jsonb)) AS part
         WHERE ${where} AND s."paymentMethod" = 'split'
       ) paid
       GROUP BY method
       ORDER BY SUM(amount) DESC, method`,
      [businessId, range.from, range.to],
    );
    return rows.map((r) => ({
      method: r.method,
      amount: kobo(r.amount),
      saleCount: Number(r.sales),
    }));
  }

  /** Products at or below their reorder point (low or out of stock) now. */
  async restockCount(businessId: string): Promise<number> {
    const [row] = await this.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM "inventory_items"
       WHERE "businessId" = $1 AND "status" IN ('low-stock', 'out-of-stock')`,
      [businessId],
    );
    return Number(row?.n ?? 0);
  }
}
