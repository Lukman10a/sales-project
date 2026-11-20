import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './../src/database/database.config';
import { nairaSql } from './../src/common/money/money';
import { Sale } from './../src/entities/sale.entity';
import { InventoryItem } from './../src/entities/inventory-item.entity';

// Runs against a real, disposable Postgres. CI provides one through
// TEST_DATABASE_URL; locally the suite is skipped unless you set it.
// WARNING: the target database is wiped.
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('Database migrations & money (e2e, real Postgres)', () => {
  let ds: DataSource;
  const businessId = '00000000-0000-4000-8000-000000000001';

  beforeAll(async () => {
    ds = new DataSource(
      buildDataSourceOptions({
        DATABASE_URL: url,
        DATABASE_PORT: 5432,
        DATABASE_SSL: 'disable',
      } as Parameters<typeof buildDataSourceOptions>[0]),
    );
    await ds.initialize();
    // dropDatabase() leaves functions (e.g. the audit trigger) behind, so
    // reset the whole schema instead.
    await ds.query('DROP SCHEMA public CASCADE');
    await ds.query('CREATE SCHEMA public');
    await ds.runMigrations();
  }, 60_000);

  afterAll(async () => {
    await ds?.destroy();
  });

  it('reaches the entity schema with migrations alone', async () => {
    expect(await ds.showMigrations()).toBe(false);
    const pending = await ds.driver.createSchemaBuilder().log();
    expect(pending.upQueries.map((q) => q.query)).toEqual([]);
  });

  it('stores money as bigint kobo', async () => {
    const rows = await ds.query<Array<{ data_type: string }>>(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name = 'sales' AND column_name = 'total'`,
    );
    expect(rows[0].data_type).toBe('bigint');
  });

  it('round-trips naira through kobo exactly', async () => {
    const item = await ds.getRepository(InventoryItem).save({
      businessId,
      name: 'Kobo test',
      category: ['Test'],
      wholesalePrice: 0.01,
      sellingPrice: 0.1 + 0.2,
      bundlePrice: 90_000_000_000.99,
      createdBy: businessId,
    });
    const back = await ds
      .getRepository(InventoryItem)
      .findOneByOrFail({ id: item.id });
    expect(back.wholesalePrice).toBe(0.01);
    expect(back.sellingPrice).toBe(0.3);
    expect(back.bundlePrice).toBe(90_000_000_000.99);
  });

  it('sums kobo in SQL and returns naira', async () => {
    const repo = ds.getRepository(Sale);
    let receiptNumber = 0;
    for (const total of [0.1, 0.2, 13_700.55]) {
      await repo.save({
        businessId,
        receiptNumber: ++receiptNumber,
        subtotal: total,
        discountAmount: 0,
        vatAmount: 0,
        total,
        saleDate: new Date(),
        soldBy: businessId,
        splitPayments: [{ method: 'cash', amount: total }],
      });
    }
    const raw = await repo
      .createQueryBuilder('sale')
      .select(nairaSql('SUM(sale.total)'), 'sum')
      .where('sale.businessId = :businessId', { businessId })
      .getRawOne<{ sum: string }>();
    expect(Number(raw?.sum)).toBe(13_700.85);

    const sale = await repo.findOneByOrFail({ businessId, total: 13_700.55 });
    expect(sale.splitPayments).toEqual([{ method: 'cash', amount: 13_700.55 }]);
  });
});
