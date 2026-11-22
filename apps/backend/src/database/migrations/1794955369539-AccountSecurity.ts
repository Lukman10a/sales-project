import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T31: single-use email tokens (verification, password reset) and per-account
 * lockout state.
 */

export class AccountSecurity1794955369539 implements MigrationInterface {
  name = 'AccountSecurity1794955369539';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "auth_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "purpose" character varying(32) NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_41e9ddfbb32da18c4e85e45c2fd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_323c4ca6708c6a8b81af2b4ee0" ON "auth_tokens" ("tokenHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0013521182a7110630a8b16be8" ON "auth_tokens" ("userId", "purpose") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "emailVerifiedAt" TIMESTAMP WITH TIME ZONE`,
    );
    // Accounts that predate verification are trusted as-is; otherwise every
    // existing owner would be locked out once their 7-day grace ran out.
    await queryRunner.query(
      `UPDATE "users" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "failedLoginAttempts" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "lockedUntil" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lockedUntil"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "failedLoginAttempts"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "emailVerifiedAt"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0013521182a7110630a8b16be8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_323c4ca6708c6a8b81af2b4ee0"`,
    );
    await queryRunner.query(`DROP TABLE "auth_tokens"`);
  }
}
