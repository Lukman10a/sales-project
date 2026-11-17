import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Money moves from numeric naira to bigint kobo (₦1 = 100 kobo) so all
 * arithmetic is exact. Values are converted in place, never dropped.
 * Entities read and write through nairaTransformer (src/common/money).
 */
const COLUMNS: Array<[table: string, column: string, precision: string]> = [
  ['sale_items', 'price', '10,2'],
  ['sale_items', 'total', '10,2'],
  ['sales', 'total', '12,2'],
  ['sales', 'accountCredit', '12,2'],
  ['sales', 'refundAmount', '12,2'],
  ['inventory_items', 'wholesalePrice', '10,2'],
  ['inventory_items', 'sellingPrice', '10,2'],
  ['inventory_items', 'bundlePrice', '10,2'],
];

// Rewrites every split payment's amount with the given SQL expression.
const splitPaymentsSql = (amount: string) => `
  UPDATE "sales" SET "splitPayments" = (
    SELECT jsonb_agg(p || jsonb_build_object('amount', ${amount}))
    FROM jsonb_array_elements("splitPayments") AS p
  )
  WHERE jsonb_typeof("splitPayments") = 'array'
    AND jsonb_array_length("splitPayments") > 0`;

export class MoneyToKobo1794931679976 implements MigrationInterface {
  name = 'MoneyToKobo1794931679976';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE bigint USING round("${column}" * 100)::bigint`,
      );
    }
    await queryRunner.query(
      splitPaymentsSql("round((p->>'amount')::numeric * 100)::bigint"),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      splitPaymentsSql("((p->>'amount')::numeric / 100)"),
    );
    for (const [table, column, precision] of COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE numeric(${precision}) USING ("${column}"::numeric / 100)`,
      );
    }
  }
}
