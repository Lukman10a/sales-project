import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sessions1794947173067 implements MigrationInterface {
  name = 'Sessions1794947173067';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "businessId" uuid NOT NULL, "tokenHash" character varying(64) NOT NULL, "familyId" uuid NOT NULL, "persistent" boolean NOT NULL DEFAULT false, "deviceLabel" character varying(120), "userAgent" character varying(512), "ip" character varying(64), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "lastUsedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, "revokedReason" character varying(16), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_57de40bc620f456c7311aa3a1e" ON "sessions" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bace6c68efc156fddac9b14bda" ON "sessions" ("tokenHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_63ea0a724c1b8e6ccae9dc22a3" ON "sessions" ("familyId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_63ea0a724c1b8e6ccae9dc22a3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bace6c68efc156fddac9b14bda"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_57de40bc620f456c7311aa3a1e"`,
    );
    await queryRunner.query(`DROP TABLE "sessions"`);
  }
}
