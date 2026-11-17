import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline: the schema as `synchronize` built it before v2 (money still in
 * numeric naira; MoneyToKobo converts it next).
 *
 * Databases created by `synchronize` already have these tables. On those the
 * baseline only records itself as applied, so `migration:run` can adopt an
 * existing database without touching its data.
 */

export class Baseline1794931618850 implements MigrationInterface {
  name = 'Baseline1794931618850';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ exists }] = (await queryRunner.query(
      `SELECT to_regclass('public.users') IS NOT NULL AS "exists"`,
    )) as Array<{ exists: boolean }>;
    if (exists) return;

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "sale_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "saleId" uuid NOT NULL, "productId" uuid NOT NULL, "productName" character varying NOT NULL, "quantity" integer NOT NULL, "price" numeric(10,2) NOT NULL, "total" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5a7dc5b4562a9e590528b3e08ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sales_paymentmethod_enum" AS ENUM('cash', 'card', 'transfer', 'split', 'account')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sales_status_enum" AS ENUM('completed', 'pending', 'refunded', 'partial-refund')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "total" numeric(12,2) NOT NULL, "paymentMethod" "public"."sales_paymentmethod_enum" NOT NULL DEFAULT 'cash', "status" "public"."sales_status_enum" NOT NULL DEFAULT 'completed', "saleDate" date NOT NULL, "soldBy" uuid NOT NULL, "customerId" uuid, "customerName" character varying, "discountPercent" numeric(5,2) NOT NULL DEFAULT '0', "splitPayments" jsonb, "loyaltyPointsUsed" integer, "accountCredit" numeric(12,2), "refundAmount" numeric(12,2), "refundReason" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "ownerId" uuid, CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_items_status_enum" AS ENUM('in-stock', 'low-stock', 'out-of-stock')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "name" character varying NOT NULL, "category" text array NOT NULL DEFAULT '{}', "sku" character varying, "barcode" character varying, "description" character varying, "wholesalePrice" numeric(10,2) NOT NULL, "sellingPrice" numeric(10,2) NOT NULL, "quantity" integer NOT NULL DEFAULT '0', "reorderPoint" integer, "supplier" character varying, "lastRestocked" date, "image" character varying, "bundleQuantity" integer, "bundlePrice" numeric(10,2), "sold" integer NOT NULL DEFAULT '0', "status" "public"."inventory_items_status_enum" NOT NULL DEFAULT 'in-stock', "confirmedByApprentice" boolean NOT NULL DEFAULT false, "confirmedBy" uuid, "confirmedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" uuid NOT NULL, "ownerId" uuid, CONSTRAINT "PK_cf2f451407242e132547ac19169" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('inventory', 'sale', 'alert', 'ai', 'system')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "userId" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'system', "title" character varying NOT NULL, "message" character varying NOT NULL, "read" boolean NOT NULL DEFAULT false, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."team_members_role_enum" AS ENUM('owner', 'manager', 'sales-assistant', 'checkout', 'inventory', 'investor')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."team_members_status_enum" AS ENUM('active', 'inactive', 'invited')`,
    );
    await queryRunner.query(
      `CREATE TABLE "team_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "userId" uuid NOT NULL, "name" character varying NOT NULL, "role" "public"."team_members_role_enum" NOT NULL DEFAULT 'sales-assistant', "permissions" text array NOT NULL DEFAULT '{}', "department" character varying, "status" "public"."team_members_status_enum" NOT NULL DEFAULT 'invited', "joinedDate" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ca3eae89dcf20c9fd95bf7460aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('owner', 'manager', 'apprentice')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'invited')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "businessName" character varying NOT NULL, "businessId" uuid, "role" "public"."users_role_enum" NOT NULL DEFAULT 'owner', "staffRole" character varying, "avatar" character varying, "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lastLogin" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."held_transactions_paymentmethod_enum" AS ENUM('cash', 'card', 'transfer', 'split', 'account')`,
    );
    await queryRunner.query(
      `CREATE TABLE "held_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "customerName" character varying NOT NULL, "items" json NOT NULL, "heldBy" uuid NOT NULL, "discountPercent" numeric(5,2) NOT NULL DEFAULT '0', "paymentMethod" "public"."held_transactions_paymentmethod_enum" NOT NULL DEFAULT 'cash', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_43dff2f932c54062c935435d1cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "phone" character varying, "company" character varying, "address" character varying, "city" character varying, "country" character varying, "bio" text, "notificationPreferences" json NOT NULL DEFAULT '{"email":true,"push":true,"lowStock":true,"newSales":true,"reports":true,"teamActivity":true,"aiInsights":true}', "appearanceSettings" json NOT NULL DEFAULT '{"theme":"light","language":"en","currency":"NGN","dateFormat":"DD/MM/YYYY","timeFormat":"24h","compactMode":false}', "dashboardSettings" json NOT NULL DEFAULT '{"layout":"default","showWelcomeMessage":true,"showTips":true,"autoRefresh":true,"refreshInterval":"1m","quickActions":[]}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8481388d6325e752cd4d7e26c6d" UNIQUE ("userId"), CONSTRAINT "REL_8481388d6325e752cd4d7e26c6" UNIQUE ("userId"), CONSTRAINT "PK_1ec6662219f4605723f1e41b6cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_type_enum" AS ENUM('sales', 'inventory', 'profit', 'expenses', 'audit', 'investor', 'customer', 'team', 'custom')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_format_enum" AS ENUM('pdf', 'csv', 'excel')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "name" character varying NOT NULL, "type" "public"."reports_type_enum" NOT NULL, "format" "public"."reports_format_enum" NOT NULL, "dateRange" jsonb NOT NULL, "status" character varying NOT NULL DEFAULT 'completed', "snapshot" jsonb, "createdBy" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_914ec8a4173f1a2a3b7cd5d73b" ON "reports" ("businessId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "ai_insights" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "insightId" character varying NOT NULL, "narrative" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b9f050c4c7b63c358346f3aa31c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e9670bb981126fcfa1b8386f64" ON "ai_insights" ("businessId", "insightId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_items" ADD CONSTRAINT "FK_c642be08de5235317d4cf3deb40" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "FK_c59a369455e162306964a73066e" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD CONSTRAINT "FK_3def3a5945638502a730c6730ac" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "FK_0a72b849753a046462b4c5a8ec2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_8481388d6325e752cd4d7e26c6d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP CONSTRAINT "FK_8481388d6325e752cd4d7e26c6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_0a72b849753a046462b4c5a8ec2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP CONSTRAINT "FK_3def3a5945638502a730c6730ac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT "FK_c59a369455e162306964a73066e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_items" DROP CONSTRAINT "FK_c642be08de5235317d4cf3deb40"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e9670bb981126fcfa1b8386f64"`,
    );
    await queryRunner.query(`DROP TABLE "ai_insights"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_914ec8a4173f1a2a3b7cd5d73b"`,
    );
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TYPE "public"."reports_format_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reports_type_enum"`);
    await queryRunner.query(`DROP TABLE "user_profiles"`);
    await queryRunner.query(`DROP TABLE "held_transactions"`);
    await queryRunner.query(
      `DROP TYPE "public"."held_transactions_paymentmethod_enum"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(`DROP TYPE "public"."team_members_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."team_members_role_enum"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP TABLE "inventory_items"`);
    await queryRunner.query(`DROP TYPE "public"."inventory_items_status_enum"`);
    await queryRunner.query(`DROP TABLE "sales"`);
    await queryRunner.query(`DROP TYPE "public"."sales_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."sales_paymentmethod_enum"`);
    await queryRunner.query(`DROP TABLE "sale_items"`);
  }
}
