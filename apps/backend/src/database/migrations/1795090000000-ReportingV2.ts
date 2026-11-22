import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T38: what correct, Lagos-time reports need.
 *
 * - `sales.createdAt` becomes timestamptz (it held UTC wall time).
 * - `sales.saleDate` is the Lagos business day. Rows that took the UTC date
 *   by default are moved to the Lagos day; back-dated sales keep theirs.
 * - `sale_items.unitCost` keeps the cost of one stock unit at sale time, so
 *   cost of goods sold does not change when a cost price is edited later.
 *   Existing lines take the product's current cost.
 */
export class ReportingV21795090000000 implements MigrationInterface {
  name = 'ReportingV21795090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(
      `ALTER TABLE "sales" ALTER COLUMN "createdAt" TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'`,
    );
    await q(`
      UPDATE "sales"
      SET "saleDate" = ("createdAt" AT TIME ZONE 'Africa/Lagos')::date
      WHERE "saleDate" = ("createdAt" AT TIME ZONE 'UTC')::date`);
    await q(
      `CREATE INDEX "IDX_sales_business_sale_date" ON "sales" ("businessId", "saleDate") `,
    );

    await q(
      `ALTER TABLE "sale_items" ADD "unitCost" bigint NOT NULL DEFAULT '0'`,
    );
    await q(`
      UPDATE "sale_items" si SET "unitCost" = ii."costPrice"
      FROM "inventory_items" ii WHERE ii."id" = si."productId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`ALTER TABLE "sale_items" DROP COLUMN "unitCost"`);
    await q(`DROP INDEX "public"."IDX_sales_business_sale_date"`);
    // saleDate keeps the Lagos day: the UTC day it replaced is not recorded.
    await q(
      `ALTER TABLE "sales" ALTER COLUMN "createdAt" TYPE TIMESTAMP USING "createdAt" AT TIME ZONE 'UTC'`,
    );
  }
}
