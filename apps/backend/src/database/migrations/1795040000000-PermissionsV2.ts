import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T33: the canonical permission set and the Owner / Manager / Cashier roles.
 *
 * Existing staff keep the access they effectively had: an empty permission
 * list meant "the old role's defaults", so those are expanded first, then
 * every old permission is renamed. Old-only view permissions (view-products,
 * view-inventory, view-sales-history) are now implied by membership.
 * Managers keep the refunds their role allowed and get the preset 10%
 * discount; cashiers get no discount until the owner allows one.
 * `users.staffRole` is folded into the role and dropped.
 */
export class PermissionsV21795040000000 implements MigrationInterface {
  name = 'PermissionsV21795040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // Old role defaults, applied where nothing was stored.
    await q(`
      UPDATE "team_members" SET "permissions" = CASE "role"::text
        WHEN 'manager' THEN ARRAY['view-products','edit-products','view-sales-history','record-sales','view-inventory','edit-inventory','assign-roles','view-reports']
        WHEN 'sales-assistant' THEN ARRAY['view-products','record-sales']
        WHEN 'checkout' THEN ARRAY['view-products','record-sales']
        WHEN 'inventory' THEN ARRAY['view-inventory','edit-inventory']
        ELSE ARRAY[]::text[] END
      WHERE cardinality("permissions") = 0`);

    // Rename to the canonical set.
    await q(`
      UPDATE "team_members" SET "permissions" = COALESCE((
        SELECT array_agg(DISTINCT m.new ORDER BY m.new)
        FROM unnest("permissions") AS p(old)
        JOIN (VALUES
          ('record-sales', 'sales.record'),
          ('edit-products', 'products.edit_price'),
          ('delete-products', 'products.delete'),
          ('edit-inventory', 'products.restock'),
          ('assign-roles', 'staff.manage'),
          ('view-reports', 'reports.view_profit')
        ) AS m(old, new) ON m.old = p.old
      ), ARRAY[]::text[])`);

    // Team roles: manager stays, everyone else becomes a cashier.
    await q(
      `ALTER TABLE "team_members" ALTER COLUMN "role" DROP DEFAULT, ALTER COLUMN "role" TYPE varchar USING "role"::text`,
    );
    await q(
      `UPDATE "team_members" SET "role" = CASE WHEN "role" IN ('manager', 'owner') THEN 'manager' ELSE 'cashier' END`,
    );
    await q(`DROP TYPE "public"."team_members_role_enum"`);
    await q(
      `CREATE TYPE "public"."team_members_role_enum" AS ENUM('manager', 'cashier')`,
    );
    await q(
      `ALTER TABLE "team_members" ALTER COLUMN "role" TYPE "public"."team_members_role_enum" USING "role"::"public"."team_members_role_enum", ALTER COLUMN "role" SET DEFAULT 'cashier'`,
    );

    await q(
      `ALTER TABLE "team_members" ADD "maxDiscountPercent" integer NOT NULL DEFAULT '0'`,
    );
    // Refunds were a manager right; discounts were unchecked before.
    await q(`
      UPDATE "team_members"
      SET "permissions" = ARRAY(SELECT DISTINCT unnest("permissions" || ARRAY['sales.refund','sales.discount']) ORDER BY 1),
          "maxDiscountPercent" = 10
      WHERE "role" = 'manager'`);

    // Login roles.
    await q(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT, ALTER COLUMN "role" TYPE varchar USING "role"::text`,
    );
    await q(
      `UPDATE "users" SET "role" = CASE WHEN "role" = 'owner' THEN 'owner' WHEN "role" = 'manager' OR "staffRole" = 'manager' THEN 'manager' ELSE 'cashier' END`,
    );
    await q(`DROP TYPE "public"."users_role_enum"`);
    await q(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('owner', 'manager', 'cashier')`,
    );
    await q(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"public"."users_role_enum", ALTER COLUMN "role" SET DEFAULT 'owner'`,
    );
    await q(`ALTER TABLE "users" DROP COLUMN "staffRole"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    await q(`ALTER TABLE "users" ADD "staffRole" character varying`);
    await q(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT, ALTER COLUMN "role" TYPE varchar USING "role"::text`,
    );
    await q(
      `UPDATE "users" SET "staffRole" = CASE "role" WHEN 'manager' THEN 'manager' WHEN 'cashier' THEN 'checkout' ELSE NULL END`,
    );
    await q(
      `UPDATE "users" SET "role" = 'apprentice' WHERE "role" = 'cashier'`,
    );
    await q(`DROP TYPE "public"."users_role_enum"`);
    await q(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('owner', 'manager', 'apprentice')`,
    );
    await q(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"public"."users_role_enum", ALTER COLUMN "role" SET DEFAULT 'owner'`,
    );

    await q(`ALTER TABLE "team_members" DROP COLUMN "maxDiscountPercent"`);
    await q(
      `ALTER TABLE "team_members" ALTER COLUMN "role" DROP DEFAULT, ALTER COLUMN "role" TYPE varchar USING "role"::text`,
    );
    await q(
      `UPDATE "team_members" SET "role" = 'checkout' WHERE "role" = 'cashier'`,
    );
    await q(`DROP TYPE "public"."team_members_role_enum"`);
    await q(
      `CREATE TYPE "public"."team_members_role_enum" AS ENUM('owner', 'manager', 'sales-assistant', 'checkout', 'inventory', 'investor')`,
    );
    await q(
      `ALTER TABLE "team_members" ALTER COLUMN "role" TYPE "public"."team_members_role_enum" USING "role"::"public"."team_members_role_enum", ALTER COLUMN "role" SET DEFAULT 'sales-assistant'`,
    );
    await q(`
      UPDATE "team_members" SET "permissions" = COALESCE((
        SELECT array_agg(DISTINCT m.old ORDER BY m.old)
        FROM unnest("permissions") AS p(new)
        JOIN (VALUES
          ('sales.record', 'record-sales'),
          ('products.edit_price', 'edit-products'),
          ('products.delete', 'delete-products'),
          ('products.restock', 'edit-inventory'),
          ('staff.manage', 'assign-roles'),
          ('reports.view_profit', 'view-reports')
        ) AS m(new, old) ON m.new = p.new
      ), ARRAY[]::text[])`);
  }
}
