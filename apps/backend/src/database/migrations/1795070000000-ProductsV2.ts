import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T36: products v2.
 * - Renames wholesalePrice/bundleQuantity/bundlePrice to costPrice/cartonSize/cartonPrice.
 * - Adds expiryDate, and a barcode unique per business (older duplicates lose it).
 * - Moves categories from a text[] column to a categories table plus a join.
 * - Adds the append-only stock_movements ledger, seeded with one opening
 *   balance per product so that quantity equals the sum of its movements.
 * - Drops the confirmedByApprentice workflow (the audit log covers it).
 */
export class ProductsV21795070000000 implements MigrationInterface {
  name = 'ProductsV21795070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Field names
    await queryRunner.query(
      `ALTER TABLE "inventory_items" RENAME COLUMN "wholesalePrice" TO "costPrice"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" RENAME COLUMN "bundleQuantity" TO "cartonSize"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" RENAME COLUMN "bundlePrice" TO "cartonPrice"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD "expiryDate" date`,
    );

    // Barcodes: blank means none; the newest product keeps a duplicate.
    await queryRunner.query(
      `UPDATE "inventory_items" SET "barcode" = NULL WHERE btrim("barcode") = ''`,
    );
    await queryRunner.query(`
      UPDATE "inventory_items" i SET "barcode" = NULL
      FROM (
        SELECT "id", ROW_NUMBER() OVER (
          PARTITION BY "businessId", "barcode" ORDER BY "createdAt" DESC, "id" DESC
        ) AS rn
        FROM "inventory_items" WHERE "barcode" IS NOT NULL
      ) d
      WHERE d."id" = i."id" AND d.rn > 1`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inventory_items_business_barcode" ON "inventory_items" ("businessId", "barcode") WHERE "barcode" IS NOT NULL`,
    );

    // Categories
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "name" character varying(100) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_categories_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_categories_business_name" ON "categories" ("businessId", "name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_categories" ("productId" uuid NOT NULL, "categoryId" uuid NOT NULL, CONSTRAINT "PK_e65c1adebf00d61f1c84a4f3950" PRIMARY KEY ("productId", "categoryId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6156a79599e274ee9d83b1de13" ON "product_categories" ("productId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fdef3adba0c284fd103d0fd369" ON "product_categories" ("categoryId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" ADD CONSTRAINT "FK_product_categories_product" FOREIGN KEY ("productId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" ADD CONSTRAINT "FK_product_categories_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(`
      INSERT INTO "categories" ("businessId", "name")
      SELECT DISTINCT i."businessId", left(btrim(c.name), 100)
      FROM "inventory_items" i, unnest(i."category") AS c(name)
      WHERE btrim(c.name) <> ''
      ON CONFLICT DO NOTHING`);
    await queryRunner.query(`
      INSERT INTO "product_categories" ("productId", "categoryId")
      SELECT DISTINCT i."id", cat."id"
      FROM "inventory_items" i, unnest(i."category") AS c(name)
      JOIN "categories" cat ON cat."name" = left(btrim(c.name), 100)
      WHERE cat."businessId" = i."businessId"
      ON CONFLICT DO NOTHING`);
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN "category"`,
    );

    // Stock ledger
    await queryRunner.query(
      `CREATE TYPE "public"."stock_movements_reason_enum" AS ENUM('sale', 'refund', 'restock', 'adjustment', 'import', 'void')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "productId" uuid NOT NULL, "delta" integer NOT NULL, "reason" "public"."stock_movements_reason_enum" NOT NULL, "refId" character varying(100), "actorUserId" uuid, "note" character varying(500), "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_stock_movements_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_business_product" ON "stock_movements" ("businessId", "productId", "createdAt") `,
    );
    await queryRunner.query(`
      INSERT INTO "stock_movements" ("businessId", "productId", "delta", "reason", "note")
      SELECT "businessId", "id", "quantity", 'adjustment', 'Opening balance'
      FROM "inventory_items" WHERE "quantity" <> 0`);
    await queryRunner.query(`
      CREATE FUNCTION "stock_movements_append_only"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'stock_movements is append-only';
      END $$`);
    await queryRunner.query(`
      CREATE TRIGGER "stock_movements_append_only"
      BEFORE UPDATE OR DELETE ON "stock_movements"
      FOR EACH ROW EXECUTE FUNCTION "stock_movements_append_only"()`);

    // The audit log replaces the confirmation workflow.
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN "confirmedByApprentice"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN "confirmedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN "confirmedAt"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD "confirmedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD "confirmedBy" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD "confirmedByApprentice" boolean NOT NULL DEFAULT true`,
    );

    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(`DROP FUNCTION "stock_movements_append_only"()`);
    await queryRunner.query(`DROP TYPE "public"."stock_movements_reason_enum"`);

    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD "category" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(`
      UPDATE "inventory_items" i SET "category" = sub.names
      FROM (
        SELECT pc."productId", array_agg(c."name" ORDER BY c."name") AS names
        FROM "product_categories" pc JOIN "categories" c ON c."id" = pc."categoryId"
        GROUP BY pc."productId"
      ) sub
      WHERE sub."productId" = i."id"`);
    await queryRunner.query(`DROP TABLE "product_categories"`);
    await queryRunner.query(`DROP TABLE "categories"`);

    await queryRunner.query(
      `DROP INDEX "public"."UQ_inventory_items_business_barcode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN "expiryDate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" RENAME COLUMN "cartonPrice" TO "bundlePrice"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" RENAME COLUMN "cartonSize" TO "bundleQuantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" RENAME COLUMN "costPrice" TO "wholesalePrice"`,
    );
  }
}
