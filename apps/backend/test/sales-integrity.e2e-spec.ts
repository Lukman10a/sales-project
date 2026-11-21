import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import type { Mailer, MailMessage } from '../src/mail/mailer';
import { InventoryItem } from '../src/entities/inventory-item.entity';
import { Sale } from '../src/entities/sale.entity';

// Sales integrity (T35) against a real database: the server prices every
// line, locked stock never oversells, an Idempotency-Key makes a resubmit a
// no-op, and refunds never give back more than was sold.
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

interface SaleBody {
  id: string;
  receiptNumber: number;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  status: string;
  refundAmount?: number;
  items: Array<{ id: string; price: number; quantity: number; unit: string }>;
}

suite('Sales integrity (e2e, real Postgres)', () => {
  jest.setTimeout(120_000);
  let app: INestApplication<App>;
  let db: DataSource;
  let seq = 0;
  let ipSeq = 0;
  const email = () => `sales-${Date.now()}-${seq++}@e2e.luxa.test`;
  const ip = () => `10.5.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

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
  const sell = (jar: Jar, body: object, key: string = randomUUID()) =>
    call('POST', '/sales', jar).set('Idempotency-Key', key).send(body);

  async function owner() {
    const res = await call('POST', '/auth/register', {})
      .send({
        email: email(),
        password: PASSWORD,
        firstName: 'Ada',
        lastName: 'Obi',
        businessName: 'Integrity Shop',
      })
      .expect(201);
    const body = res.body as { user: { id: string; businessId: string } };
    return { jar: cookiesOf(res), ...body.user };
  }

  async function product(jar: Jar, over: object = {}) {
    const res = await call('POST', '/inventory', jar)
      .send({
        name: `Rice ${seq++}`,
        sellingPrice: 100,
        costPrice: 60,
        quantity: 50,
        cartonSize: 10,
        cartonPrice: 900,
        ...over,
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  const stockOf = async (id: string) =>
    (await db.getRepository(InventoryItem).findOneByOrFail({ id })).quantity;

  it('charges the catalogue price whatever price the client sends', async () => {
    const a = await owner();
    const p = await product(a.jar);

    const sale = (
      await sell(a.jar, {
        items: [
          { productId: p, quantity: 2, price: 0.01 },
          { productId: p, quantity: 1, unit: 'carton', price: 0 },
        ],
        paymentMethod: 'cash',
      }).expect(201)
    ).body as SaleBody;

    expect(sale).toMatchObject({ subtotal: 1100, total: 1100, vatAmount: 0 });
    expect(sale.items.map((i) => i.price).sort()).toEqual([100, 900]);
    expect(await stockOf(p)).toBe(50 - 2 - 10);
  });

  it('adds VAT when the business turns it on, after the discount', async () => {
    const a = await owner();
    const p = await product(a.jar);
    await call('PATCH', '/sales/settings', a.jar)
      .send({ vatEnabled: true })
      .expect(200);

    const sale = (
      await sell(a.jar, {
        items: [{ productId: p, quantity: 2 }],
        discountPercent: 10,
      }).expect(201)
    ).body as SaleBody;
    expect(sale).toMatchObject({
      subtotal: 200,
      discountAmount: 20,
      vatAmount: 13.5,
      total: 193.5,
    });

    await sell(a.jar, {
      items: [{ productId: p, quantity: 2 }],
      discountPercent: 10,
      paymentMethod: 'split',
      splitPayments: [
        { method: 'cash', amount: 100 },
        { method: 'transfer', amount: 93.49 },
      ],
    }).expect(400);
  });

  it('numbers receipts per business', async () => {
    const a = await owner();
    const b = await owner();
    const pa = await product(a.jar);
    const pb = await product(b.jar);
    const numberOf = async (jar: Jar, p: string) =>
      (
        (
          await sell(jar, { items: [{ productId: p, quantity: 1 }] }).expect(
            201,
          )
        ).body as SaleBody
      ).receiptNumber;

    expect(await numberOf(a.jar, pa)).toBe(1);
    expect(await numberOf(a.jar, pa)).toBe(2);
    expect(await numberOf(b.jar, pb)).toBe(1);
  });

  it('sells the last 5 units exactly once across 20 parallel sales', async () => {
    const a = await owner();
    const p = await product(a.jar, { quantity: 5 });

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        sell(a.jar, { items: [{ productId: p, quantity: 1 }] }),
      ),
    );
    const codes = results.map((r) => r.status);
    expect(codes.filter((c) => c === 201)).toHaveLength(5);
    expect(codes.filter((c) => c === 409)).toHaveLength(15);
    expect(await stockOf(p)).toBe(0);

    const numbers = results
      .filter((r) => r.status === 201)
      .map((r) => (r.body as SaleBody).receiptNumber)
      .sort((x, y) => x - y);
    expect(numbers).toEqual([1, 2, 3, 4, 5]);
  });

  it('makes one sale for a double submit, and refuses a reused key', async () => {
    const a = await owner();
    const p = await product(a.jar);
    const key = randomUUID();
    const body = { items: [{ productId: p, quantity: 3 }] };

    const [first, second] = await Promise.all([
      sell(a.jar, body, key),
      sell(a.jar, body, key),
    ]);
    expect([first.status, second.status]).toEqual([201, 201]);
    expect((first.body as SaleBody).id).toBe((second.body as SaleBody).id);
    expect(
      await db.getRepository(Sale).countBy({ businessId: a.businessId }),
    ).toBe(1);
    expect(await stockOf(p)).toBe(47);

    await sell(a.jar, { items: [{ productId: p, quantity: 4 }] }, key).expect(
      422,
    );
    await call('POST', '/sales', a.jar).send(body).expect(400);
  });

  it('refunds per line, never more than sold, and puts stock back', async () => {
    const a = await owner();
    const p = await product(a.jar);
    const sale = (
      await sell(a.jar, {
        items: [{ productId: p, quantity: 4 }],
        discountPercent: 50,
      }).expect(201)
    ).body as SaleBody;
    const lineId = sale.items[0].id;
    const refund = (body: object) =>
      call('PATCH', `/sales/${sale.id}/refund`, a.jar).send(body);

    await refund({ items: [{ saleItemId: lineId, quantity: 1 }] }).expect(400);
    const part = (
      await refund({
        refundReason: 'one was damaged',
        items: [{ saleItemId: lineId, quantity: 1 }],
      }).expect(200)
    ).body as SaleBody;
    expect(part).toMatchObject({ status: 'partial-refund', refundAmount: 50 });
    expect(await stockOf(p)).toBe(47);

    await refund({
      refundReason: 'too many',
      items: [{ saleItemId: lineId, quantity: 4 }],
    }).expect(400);

    const rest = (
      await refund({ refundReason: 'customer returned the rest' }).expect(200)
    ).body as SaleBody;
    expect(rest).toMatchObject({ status: 'refunded', refundAmount: 200 });
    expect(await stockOf(p)).toBe(50);
    await refund({ refundReason: 'again' }).expect(400);
  });

  it('keeps held sales to their creator and prices them on resume', async () => {
    const a = await owner();
    const p = await product(a.jar);
    const held = (
      await call('POST', '/sales/held', a.jar)
        .send({
          customerName: 'Walk-in',
          items: [{ productId: p, quantity: 2, price: 1 }],
        })
        .expect(201)
    ).body as { id: string };
    await call('PATCH', `/inventory/${p}`, a.jar)
      .send({ sellingPrice: 150 })
      .expect(200);

    const list = (await call('GET', '/sales/held', a.jar).expect(200))
      .body as Array<{ id: string; items: Array<{ price: number }> }>;
    expect(list.find((h) => h.id === held.id)?.items).toEqual([
      expect.objectContaining({ quantity: 2, price: 150 }),
    ]);

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
    const theirs = (await call('GET', '/sales/held', cashier).expect(200))
      .body as unknown[];
    expect(theirs).toEqual([]);
    await call('DELETE', `/sales/held/${held.id}`, cashier).expect(404);
    await call('PATCH', '/sales/settings', cashier)
      .send({ vatEnabled: true })
      .expect(403);
  });
});
