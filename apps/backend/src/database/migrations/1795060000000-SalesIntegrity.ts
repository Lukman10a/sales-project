import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T35: sales are priced by the server. Each sale keeps its subtotal,
 * discount, VAT and a per-business receipt number; each line keeps its unit
 * (unit or carton) and how much of it was refunded. Idempotency keys make a
 * resubmitted sale a no-op. Existing rows are backfilled so nothing is lost.
 */
export class SalesIntegrity1795060000000 implements MigrationInterface {
  name = 'SalesIntegrity1795060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Business setting on the owner's row.
    await queryRunner.query(
      `ALTER TABLE "users" ADD "vatEnabled" boolean NOT NULL DEFAULT false`,
    );

    // Sale lines.
    await queryRunner.query(
      `CREATE TYPE "public"."sale_items_unit_enum" AS ENUM('unit', 'carton')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_items" ADD "unit" "public"."sale_items_unit_enum" NOT NULL DEFAULT 'unit'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_items" ADD "unitsPerItem" integer NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_items" ADD "refundedQuantity" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE "sale_items" si SET "refundedQuantity" = si."quantity"
       FROM "sales" s WHERE s."id" = si."saleId" AND s."status" = 'refunded'`,
    );

    // Sale totals: the old total was already net of any discount.
    await queryRunner.query(`ALTER TABLE "sales" ADD "subtotal" bigint`);
    await queryRunner.query(`ALTER TABLE "sales" ADD "discountAmount" bigint`);
    await queryRunner.query(
      `ALTER TABLE "sales" ADD "vatAmount" bigint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`
      UPDATE "sales" s SET
        "subtotal" = GREATEST(s."total", COALESCE(
          (SELECT SUM(si."total") FROM "sale_items" si WHERE si."saleId" = s."id"), s."total")),
        "discountAmount" = GREATEST(0, COALESCE(
          (SELECT SUM(si."total") FROM "sale_items" si WHERE si."saleId" = s."id"), s."total") - s."total")`);
    await queryRunner.query(
      `ALTER TABLE "sales" ALTER COLUMN "subtotal" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ALTER COLUMN "discountAmount" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ALTER COLUMN "vatAmount" DROP DEFAULT`,
    );

    // Receipt numbers: number existing sales in order, then continue from there.
    await queryRunner.query(`ALTER TABLE "sales" ADD "receiptNumber" integer`);
    await queryRunner.query(`
      UPDATE "sales" s SET "receiptNumber" = n.rn
      FROM (SELECT "id", ROW_NUMBER() OVER (
              PARTITION BY "businessId" ORDER BY "createdAt", "id") AS rn
            FROM "sales") n
      WHERE n."id" = s."id"`);
    await queryRunner.query(
      `ALTER TABLE "sales" ALTER COLUMN "receiptNumber" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sales_business_receipt" ON "sales" ("businessId", "receiptNumber") `,
    );
    await queryRunner.query(
      `CREATE TABLE "receipt_counters" ("businessId" uuid NOT NULL, "lastNumber" integer NOT NULL, CONSTRAINT "PK_receipt_counters_businessId" PRIMARY KEY ("businessId"))`,
    );
    await queryRunner.query(`
      INSERT INTO "receipt_counters" ("businessId", "lastNumber")
      SELECT "businessId", MAX("receiptNumber") FROM "sales" GROUP BY "businessId"`);

    // Idempotency keys for POST /sales.
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" ("businessId" uuid NOT NULL, "key" character varying(255) NOT NULL, "requestHash" character varying(64) NOT NULL, "saleId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_idempotency_keys_business_key" PRIMARY KEY ("businessId", "key"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
    await queryRunner.query(`DROP TABLE "receipt_counters"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_sales_business_receipt"`);
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "receiptNumber"`);
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "vatAmount"`);
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "discountAmount"`);
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "subtotal"`);
    await queryRunner.query(
      `ALTER TABLE "sale_items" DROP COLUMN "refundedQuantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_items" DROP COLUMN "unitsPerItem"`,
    );
    await queryRunner.query(`ALTER TABLE "sale_items" DROP COLUMN "unit"`);
    await queryRunner.query(`DROP TYPE "public"."sale_items_unit_enum"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "vatEnabled"`);
  }
}
