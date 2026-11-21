import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import type { Mailer, MailMessage } from '../src/mail/mailer';
import { InventoryItem } from '../src/entities/inventory-item.entity';
import { StockMovement } from '../src/entities/stock-movement.entity';
import { AuditEvent } from '../src/entities/audit-event.entity';

// Products v2 (T36) against a real database: every stock change goes
// through the ledger, so quantity always equals the sum of the movements;
// an import previews without writing; price edits are audited.
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'Correct-Horse-42';
type Jar = Record<string, string>;

function cookiesOf(res: request.Response, into: Jar = {}): Jar {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  for (const line of raw ?? []) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    const value = pair.slice(eq + 1);
    if (value) into[pair.slice(0, eq)] = value;
    else delete into[pair.slice(0, eq)];
  }
  return into;
}

const cookieHeader = (jar: Jar) =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

class NullMailer implements Mailer {
  send(_message: MailMessage) {
    return Promise.resolve();
  }
}

interface Product {
  id: string;
  name: string;
  quantity: number;
  status: string;
  category: string[];
  costPrice: number;
  expiryDate: string | null;
}

const isoDay = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

suite('Products v2 (e2e, real Postgres)', () => {
  jest.setTimeout(120_000);
  let app: INestApplication<App>;
  let db: DataSource;
  let seq = 0;
  let ipSeq = 0;
  const email = () => `products-${Date.now()}-${seq++}@e2e.luxa.test`;
  const ip = () => `10.6.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.DB_MANUAL_INIT = 'false';
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { AppModule } =
      require('../src/app.module') as typeof import('../src/app.module');
    const { configureApp } =
      require('../src/bootstrap') as typeof import('../src/bootstrap');
    const { MAILER } =
      require('../src/mail/mailer') as typeof import('../src/mail/mailer');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MAILER)
      .useValue(new NullMailer())
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    await db.runMigrations();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());
  const call = (method: string, path: string, jar: Jar) => {
    const verb = method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete';
    const req = http()
      [verb](path)
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', ip())
      .set('Cookie', cookieHeader(jar));
    return jar.luxa_csrf ? req.set('x-csrf-token', jar.luxa_csrf) : req;
  };

  async function owner() {
    const res = await call('POST', '/auth/register', {})
      .send({
        email: email(),
        password: PASSWORD,
        firstName: 'Ada',
        lastName: 'Obi',
        businessName: 'Products Shop',
      })
      .expect(201);
    const body = res.body as { user: { id: string; businessId: string } };
    return { jar: cookiesOf(res), ...body.user };
  }

  async function create(jar: Jar, over: object = {}) {
    const res = await call('POST', '/inventory', jar)
      .send({
        name: `Rice ${seq++}`,
        sellingPrice: 100,
        costPrice: 60,
        quantity: 20,
        reorderPoint: 3,
        cartonSize: 5,
        cartonPrice: 450,
        category: ['Food'],
        ...over,
      })
      .expect(201);
    return res.body as Product;
  }

  /** Products whose quantity is not the sum of their movements. */
  const drift = (businessId: string) =>
    db.query<unknown[]>(
      `SELECT p.id FROM inventory_items p
       LEFT JOIN stock_movements m ON m."productId" = p.id
       WHERE p."businessId" = $1
       GROUP BY p.id HAVING p.quantity <> COALESCE(SUM(m.delta), 0)`,
      [businessId],
    );

  const upload = (path: string, jar: Jar, name: string, text: string) =>
    call('POST', path, jar).attach('file', Buffer.from(text), {
      filename: name,
      contentType: 'text/csv',
    });

  it('keeps quantity equal to the ledger through every kind of change', async () => {
    const a = await owner();
    const p = await create(a.jar);
    expect(p).toMatchObject({ quantity: 20, category: ['Food'] });

    const sale = (
      await call('POST', '/sales', a.jar)
        .set('Idempotency-Key', randomUUID())
        .send({
          items: [
            { productId: p.id, quantity: 2 },
            { productId: p.id, quantity: 1, unit: 'carton' },
          ],
        })
        .expect(201)
    ).body as { id: string; items: Array<{ id: string; unit: string }> };
    const carton = sale.items.find((i) => i.unit === 'carton')!;
    await call('PATCH', `/sales/${sale.id}/refund`, a.jar)
      .send({
        refundReason: 'Carton was damaged',
        items: [{ saleItemId: carton.id, quantity: 1 }],
      })
      .expect(200);
    await call('POST', `/inventory/${p.id}/restock`, a.jar)
      .send({ quantity: 7, note: 'Delivery from Dangote' })
      .expect(200);
    const adjusted = (
      await call('POST', `/inventory/${p.id}/adjust`, a.jar)
        .send({ delta: -4, reason: 'Count after stocktake' })
        .expect(200)
    ).body as Product;
    // 20 - 2 - 5 + 5 + 7 - 4
    expect(adjusted.quantity).toBe(21);

    const moves = (
      await call('GET', `/inventory/${p.id}/movements`, a.jar).expect(200)
    ).body as Array<{
      delta: number;
      reason: string;
      refId: string | null;
      actorName?: string;
    }>;
    expect(moves.map((m) => [m.reason, m.delta])).toEqual([
      ['adjustment', -4],
      ['restock', 7],
      ['refund', 5],
      ['sale', -7],
      ['restock', 20],
    ]);
    expect(moves[3]).toMatchObject({ refId: sale.id, actorName: 'Ada Obi' });
    expect(await drift(a.businessId)).toEqual([]);

    // Adjustments need a reason and can't take stock below zero.
    await call('POST', `/inventory/${p.id}/adjust`, a.jar)
      .send({ delta: -1 })
      .expect(400);
    await call('POST', `/inventory/${p.id}/adjust`, a.jar)
      .send({ delta: -22, reason: 'Gone' })
      .expect(400);
    // And quantity can't be edited directly any more.
    await call('PATCH', `/inventory/${p.id}`, a.jar)
      .send({ quantity: 100 })
      .expect(400);
    expect(await drift(a.businessId)).toEqual([]);
  });

  it('keeps the ledger append-only in the database', async () => {
    const a = await owner();
    await create(a.jar);
    await expect(
      db.query(`UPDATE stock_movements SET delta = 0 WHERE "businessId" = $1`, [
        a.businessId,
      ]),
    ).rejects.toThrow(/append-only/);
    await expect(
      db.query(`DELETE FROM stock_movements WHERE "businessId" = $1`, [
        a.businessId,
      ]),
    ).rejects.toThrow(/append-only/);
  });

  it('previews an import with per-row errors and writes nothing until confirmed', async () => {
    const a = await owner();
    const existing = await create(a.jar, { sku: 'RICE-5', quantity: 10 });
    const file = [
      'name,sellingPrice,costPrice,quantity,sku,category,expiryDate',
      `${existing.name},120,70,15,RICE-5,Food,`,
      `Milk 1L,1200,900,6,MILK-1,"Dairy, Drinks",${isoDay(10)}`,
      'Bad price,abc,,,BAD-1,,',
      ',100,,,,,',
    ].join('\n');
    const count = async () => ({
      products: await db
        .getRepository(InventoryItem)
        .countBy({ businessId: a.businessId }),
      moves: await db
        .getRepository(StockMovement)
        .countBy({ businessId: a.businessId }),
    });
    const before = await count();

    const preview = (
      await upload(
        '/inventory/import/preview',
        a.jar,
        'stock.csv',
        file,
      ).expect(200)
    ).body as {
      summary: Record<string, number>;
      rows: Array<{ row: number; action: string; errors: string[] }>;
    };
    expect(preview.summary).toEqual({
      rows: 4,
      valid: 2,
      invalid: 2,
      creates: 1,
      updates: 1,
    });
    expect(preview.rows[2]).toMatchObject({ row: 4 });
    expect(preview.rows[2].errors[0]).toMatch(/sellingPrice/);
    expect(preview.rows[3].errors).toContain('name is required');
    expect(await count()).toEqual(before);

    await upload('/inventory/import/confirm', a.jar, 'stock.csv', file).expect(
      200,
    );
    expect(await count()).toEqual({
      products: before.products + 1,
      moves: before.moves + 2,
    });
    const updated = (
      await call('GET', `/inventory/${existing.id}`, a.jar).expect(200)
    ).body as Product & { sellingPrice: number };
    expect(updated).toMatchObject({ quantity: 15, sellingPrice: 120 });
    expect(await drift(a.businessId)).toEqual([]);

    const milk = (
      (await call('GET', '/inventory?search=Milk', a.jar).expect(200)).body as {
        data: Product[];
      }
    ).data[0];
    expect(milk.category.sort()).toEqual(['Dairy', 'Drinks']);

    // Upload limits and the template.
    await call('POST', '/inventory/import/preview', a.jar).expect(400);
    const template = await call('GET', '/inventory/import/template', a.jar)
      .buffer(true)
      .expect(200);
    expect(template.headers['content-type']).toContain('spreadsheetml');
  });

  it('lists products expiring soon, and counts them on the dashboard', async () => {
    const a = await owner();
    const soon = await create(a.jar, { expiryDate: isoDay(5) });
    const expired = await create(a.jar, { expiryDate: isoDay(-1) });
    await create(a.jar, { expiryDate: isoDay(90) });
    await create(a.jar);

    const list = (
      await call('GET', '/inventory?expiring=30&sort=expiry', a.jar).expect(200)
    ).body as { data: Product[] };
    expect(list.data.map((p) => p.id)).toEqual([expired.id, soon.id]);

    const dashboard = (await call('GET', '/dashboard', a.jar).expect(200))
      .body as { metrics: { expiringSoonCount: number } };
    expect(dashboard.metrics.expiringSoonCount).toBe(2);
  });

  it('audits price edits, keeps barcodes unique, and gates stock changes', async () => {
    const a = await owner();
    const p = await create(a.jar, { barcode: '6150000000001' });
    await call('PATCH', `/inventory/${p.id}`, a.jar)
      .send({ sellingPrice: 130, costPrice: 65 })
      .expect(200);
    const events = await db.getRepository(AuditEvent).find({
      where: {
        businessId: a.businessId,
        entityId: p.id,
        action: 'product.price_changed',
      },
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      before: { costPrice: 60, sellingPrice: 100 },
      after: { costPrice: 65, sellingPrice: 130 },
    });

    await call('POST', '/inventory', a.jar)
      .send({ name: 'Copy', sellingPrice: 1, barcode: '6150000000001' })
      .expect(409);

    const invite = (
      await call('POST', '/team', a.jar)
        .send({ email: email(), name: 'Kemi Cashier', role: 'cashier' })
        .expect(201)
    ).body as { email: string; temporaryPassword: string };
    const cashier = cookiesOf(
      await call('POST', '/auth/login', {})
        .send({ email: invite.email, password: invite.temporaryPassword })
        .expect(200),
    );
    await call('POST', `/inventory/${p.id}/restock`, cashier)
      .send({ quantity: 1 })
      .expect(403);
    await call('POST', `/inventory/${p.id}/adjust`, cashier)
      .send({ delta: 1, reason: 'x' })
      .expect(403);
    await call('PATCH', `/inventory/${p.id}`, cashier)
      .send({ sellingPrice: 1 })
      .expect(403);
    await upload(
      '/inventory/import/preview',
      cashier,
      'x.csv',
      'name,sellingPrice\nA,1',
    ).expect(403);
  });
});
