import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T32: authenticator-app two-step verification. The TOTP seed is stored
 * sealed (AES-256-GCM); backup codes only as keyed digests. Existing
 * businesses keep 2FA optional; new ones require it for owners and managers.
 */
export class TwoFactor1795030000000 implements MigrationInterface {
  name = 'TwoFactor1795030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "two_factor_backup_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "codeHash" character varying(64) NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_two_factor_backup_codes_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_two_factor_backup_codes_userId" ON "two_factor_backup_codes" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_two_factor_backup_codes_codeHash" ON "two_factor_backup_codes" ("codeHash") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "twoFactorSecret" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "twoFactorEnabledAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "twoFactorLastStep" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "requireTwoFactor" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "requireTwoFactor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "twoFactorLastStep"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "twoFactorEnabledAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "twoFactorSecret"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_two_factor_backup_codes_codeHash"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_two_factor_backup_codes_userId"`,
    );
    await queryRunner.query(`DROP TABLE "two_factor_backup_codes"`);
  }
}
