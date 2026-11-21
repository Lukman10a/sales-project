import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T37: the expenses table, its audit actions, and the new `expenses.manage`
 * permission for existing managers (the manager preset now includes it).
 */
export class Expenses1795080000000 implements MigrationInterface {
  name = 'Expenses1795080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    await q(
      `CREATE TYPE "public"."expenses_category_enum" AS ENUM('rent', 'salaries', 'fuel', 'utilities', 'transport', 'supplies', 'other')`,
    );
    await q(
      `CREATE TABLE "expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "category" "public"."expenses_category_enum" NOT NULL, "amount" bigint NOT NULL, "date" date NOT NULL, "note" character varying(500), "recordedBy" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_expenses_id" PRIMARY KEY ("id"))`,
    );
    await q(
      `CREATE INDEX "IDX_expenses_business_date" ON "expenses" ("businessId", "date") `,
    );

    // ADD VALUE cannot run inside a transaction block on older Postgres,
    // but IF NOT EXISTS keeps it safe to re-run; PG 12+ allows it in one.
    for (const action of [
      'expense.recorded',
      'expense.updated',
      'expense.deleted',
    ]) {
      await q(
        `ALTER TYPE "public"."audit_events_action_enum" ADD VALUE IF NOT EXISTS '${action}'`,
      );
    }

    await q(`
      UPDATE "team_members"
      SET "permissions" = ARRAY(SELECT DISTINCT unnest("permissions" || ARRAY['expenses.manage']) ORDER BY 1)
      WHERE "role" = 'manager'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(
      `UPDATE "team_members" SET "permissions" = array_remove("permissions", 'expenses.manage')`,
    );
    // The audit enum keeps its expense values: audit rows are append-only
    // and may already use them.
    await q(`DROP INDEX "public"."IDX_expenses_business_date"`);
    await q(`DROP TABLE "expenses"`);
    await q(`DROP TYPE "public"."expenses_category_enum"`);
  }
}
