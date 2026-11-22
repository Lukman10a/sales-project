import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T34: the append-only audit trail. Besides the table, the database itself
 * refuses UPDATE and DELETE on it (a trigger, which works for every role),
 * and the app role loses those privileges where the provider lets us revoke
 * them.
 */
export class AuditEvents1795050000000 implements MigrationInterface {
  name = 'AuditEvents1795050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."audit_events_action_enum" AS ENUM('sale.recorded', 'sale.refunded', 'product.created', 'product.updated', 'product.price_changed', 'product.stock_adjusted', 'product.confirmed', 'product.deleted', 'product.imported', 'staff.invited', 'staff.updated', 'staff.role_changed', 'staff.status_changed', 'staff.permissions_changed', 'staff.removed', 'auth.signed_in', 'auth.sign_in_failed', 'two_factor.enabled', 'two_factor.disabled', 'two_factor.backup_codes_regenerated', 'two_factor.requirement_changed', 'session.revoked', 'session.revoked_all')`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "actorUserId" uuid, "actorName" character varying(200) NOT NULL, "action" "public"."audit_events_action_enum" NOT NULL, "entityType" character varying(50) NOT NULL, "entityId" character varying(100), "before" jsonb, "after" jsonb, "ip" character varying(64), "userAgent" character varying(512), "sessionId" uuid, "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_audit_events_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_business_created" ON "audit_events" ("businessId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_business_entity" ON "audit_events" ("businessId", "entityType", "entityId") `,
    );
    await queryRunner.query(`
      CREATE FUNCTION "audit_events_append_only"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'audit_events is append-only';
      END $$`);
    await queryRunner.query(`
      CREATE TRIGGER "audit_events_append_only"
      BEFORE UPDATE OR DELETE ON "audit_events"
      FOR EACH ROW EXECUTE FUNCTION "audit_events_append_only"()`);
    // Belt and braces; managed providers may not allow it for the owner role.
    await queryRunner.query(`
      DO $$
      BEGIN
        EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE ON "audit_events" FROM ' || quote_ident(current_user);
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'could not revoke audit_events privileges';
      END $$`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_events"`);
    await queryRunner.query(`DROP FUNCTION "audit_events_append_only"()`);
    await queryRunner.query(`DROP TYPE "public"."audit_events_action_enum"`);
  }
}
