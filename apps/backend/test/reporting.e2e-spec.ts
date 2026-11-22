import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import type { Mailer, MailMessage } from '../src/mail/mailer';
import { businessDay } from '../src/common/time/business-day';
import { addDays } from '../src/reporting/periods';
import { ReportingRepository } from '../src/reporting/reporting.repository';

// Dashboard and reports v2 (T38) against a real database, checked against
// figures worked out by hand (see `fixture`).
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

/** Every key anywhere in a JSON value. */
function keysOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => [k, ...keysOf(v)]);
  }
  return [];
}

suite('Reports v2 (e2e, real Postgres)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication<App>;
  let db: DataSource;
  let seq = 0;
  let ipSeq = 0;
  const email = () => `reports-${Date.now()}-${seq++}@e2e.luxa.test`;
  const ip = () => `10.7.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

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
      .set('Idempotency-Key', randomUUID())
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', ip())
      .set('Cookie', cookieHeader(jar));
    return jar.luxa_csrf ? req.set('x-csrf-token', jar.luxa_csrf) : req;
  };
  const body = <T>(res: request.Response) => res.body as T;

  async function owner() {
    const res = await call('POST', '/auth/register', {})
      .send({
        email: email(),
        password: PASSWORD,
        firstName: 'Ada',
        lastName: 'Obi',
        businessName: 'Reports Shop',
      })
      .expect(201);
    return {
      jar: cookiesOf(res),
      id: body<{ user: { id: string } }>(res).user.id,
    };
  }

  async function cashierOf(jar: Jar) {
    const invite = body<{ email: string; temporaryPassword: string }>(
      await call('POST', '/team', jar)
        .send({ email: email(), name: 'Kemi Cashier', role: 'cashier' })
        .expect(201),
    );
    const res = await call('POST', '/auth/login', {})
      .send({ email: invite.email, password: invite.temporaryPassword })
      .expect(200);
    return cookiesOf(res);
  }

  type Sale = { id: string; items: Array<{ id: string; productId: string }> };
  const sell = async (jar: Jar, payload: object) =>
    body<Sale>(await call('POST', '/sales', jar).send(payload).expect(201));

  /**
   * One day of trading, VAT off (a new business's default):
   *
   * | sale | lines                     | paid             | kept    | sales  | COGS  | units |
   * | S1   | 2 x A, 10% off            | cash 1,800       | all     | 1,800  | 1,200 | 2     |
   * | S2   | 1 carton of B (10 units)  | transfer 4,500   | all     | 4,500  | 2,000 | 10    |
   * | S3   | 1 x A + 2 x B             | cash 1,500 + card 500 | all | 2,000 | 1,000 | 3   |
   * | S4   | 4 x A                     | cash 4,000       | 3 x A   | 3,000  | 1,800 | 3     |
   * | S5   | 1 x A                     | card 1,000       | none    | 0      | 0     | 0     |
   *
   * A sells at 1,000 and costs 600; B sells at 500 (4,500 a carton of 10)
   * and costs 200. Sales 11,300; COGS 6,000; gross profit 5,300.
   * Expenses: rent 1,000 + fuel 300. Net profit 4,000.
   */
  async function fixture() {
    const o = await owner();
    const product = async (data: object) =>
      body<{ id: string }>(
        await call('POST', '/inventory', o.jar).send(data).expect(201),
      );
    const a = await product({
      name: 'Rice 1kg',
      sellingPrice: 1000,
      costPrice: 600,
      quantity: 100,
    });
    const b = await product({
      name: 'Milk',
      sellingPrice: 500,
      costPrice: 200,
      cartonSize: 10,
      cartonPrice: 4500,
      quantity: 100,
    });
    await product({ name: 'Sold out', sellingPrice: 10, quantity: 0 });

    await sell(o.jar, {
      items: [{ productId: a.id, quantity: 2 }],
      paymentMethod: 'cash',
      discountPercent: 10,
    });
    await sell(o.jar, {
      items: [{ productId: b.id, quantity: 1, unit: 'carton' }],
      paymentMethod: 'transfer',
    });
    await sell(o.jar, {
      items: [
        { productId: a.id, quantity: 1 },
        { productId: b.id, quantity: 2 },
      ],
      paymentMethod: 'split',
      splitPayments: [
        { method: 'cash', amount: 1500 },
        { method: 'card', amount: 500 },
      ],
    });
    const s4 = await sell(o.jar, {
      items: [{ productId: a.id, quantity: 4 }],
      paymentMethod: 'cash',
    });
    await call('PATCH', `/sales/${s4.id}/refund`, o.jar)
      .send({
        refundReason: 'One bag was torn',
        items: [{ saleItemId: s4.items[0].id, quantity: 1 }],
      })
      .expect(200);
    const s5 = await sell(o.jar, {
      items: [{ productId: a.id, quantity: 1 }],
      paymentMethod: 'card',
    });
    await call('PATCH', `/sales/${s5.id}/refund`, o.jar)
      .send({ refundReason: 'Changed their mind' })
      .expect(200);

    const today = businessDay();
    for (const [category, amount] of [
      ['rent', 1000],
      ['fuel', 300],
    ] as const) {
      await call('POST', '/expenses', o.jar)
        .send({ category, amount, date: today })
        .expect(201);
    }
    return { o, a, b, today };
  }

  it('matches the hand-worked figures on every report', async () => {
    const { o, a, b, today } = await fixture();

    const summary = body<Record<string, unknown>>(
      await call('GET', '/dashboard/summary?period=today', o.jar).expect(200),
    );
    expect(summary).toMatchObject({
      period: 'today',
      from: today,
      to: today,
      previous: { from: addDays(today, -7), to: addDays(today, -7) },
      sales: { value: 11300, previous: 0, change: null },
      profit: { value: 5300, previous: 0, change: null },
      itemsSold: { value: 18, previous: 0 },
      saleCount: { value: 4, previous: 0 },
      restockCount: { value: 1, previous: null },
      onShiftStaff: { value: 1, previous: 0 },
    });

    const series = body<{
      current: Array<{ date: string; sales: number; profit: number }>;
      previous: { points: Array<{ date: string; sales: number }> };
    }>(
      await call(
        'GET',
        `/reports/revenue-series?from=${addDays(today, -1)}&to=${today}&compare=previous`,
        o.jar,
      ).expect(200),
    );
    expect(series.current).toEqual([
      { date: addDays(today, -1), sales: 0, profit: 0 },
      { date: today, sales: 11300, profit: 5300 },
    ]);
    expect(series.previous.points.map((p) => p.date)).toEqual([
      addDays(today, -3),
      addDays(today, -2),
    ]);

    const byUnits = body<{ products: Array<Record<string, unknown>> }>(
      await call(
        'GET',
        '/reports/top-products?period=today&by=units',
        o.jar,
      ).expect(200),
    );
    expect(byUnits.products).toEqual([
      { productId: b.id, name: 'Milk', units: 12, revenue: 5500, profit: 3100 },
      {
        productId: a.id,
        name: 'Rice 1kg',
        units: 6,
        revenue: 5800,
        profit: 2200,
      },
    ]);
    const byRevenue = body<{ products: Array<{ productId: string }> }>(
      await call(
        'GET',
        '/reports/top-products?period=today&by=revenue&limit=1',
        o.jar,
      ).expect(200),
    );
    expect(byRevenue.products.map((p) => p.productId)).toEqual([a.id]);

    const payments = body<Record<string, unknown>>(
      await call('GET', '/reports/payment-methods?period=today', o.jar).expect(
        200,
      ),
    );
    expect(payments).toMatchObject({
      total: 11300,
      methods: [
        { method: 'cash', amount: 6300, saleCount: 3 },
        { method: 'transfer', amount: 4500, saleCount: 1 },
        { method: 'card', amount: 500, saleCount: 1 },
      ],
    });

    const pnl = body<Record<string, unknown>>(
      await call('GET', `/reports/pnl?from=${today}&to=${today}`, o.jar).expect(
        200,
      ),
    );
    expect(pnl).toEqual({
      from: today,
      to: today,
      sales: 11300,
      cogs: 6000,
      grossProfit: 5300,
      expenses: {
        total: 1300,
        byCategory: [
          { category: 'rent', amount: 1000 },
          { category: 'fuel', amount: 300 },
        ],
      },
      netProfit: 4000,
    });

    // A sale and an expense clear the cached reports at once.
    await sell(o.jar, {
      items: [{ productId: a.id, quantity: 1 }],
      paymentMethod: 'cash',
    });
    const after = body<{ sales: { value: number } }>(
      await call('GET', '/dashboard/summary?period=today', o.jar).expect(200),
    );
    expect(after.sales.value).toBe(12300);
    await call('POST', '/expenses', o.jar)
      .send({ category: 'other', amount: 50, date: today })
      .expect(201);
    const pnlAfter = body<{ netProfit: number }>(
      await call('GET', `/reports/pnl?from=${today}&to=${today}`, o.jar).expect(
        200,
      ),
    );
    expect(pnlAfter.netProfit).toBe(4000 + 1000 - 600 - 50);
  });

  it('never sends a cashier a cost or profit field', async () => {
    const { o, today } = await fixture();
    const cashier = await cashierOf(o.jar);

    for (const path of [
      '/dashboard/summary?period=today',
      `/reports/revenue-series?from=${today}&to=${today}&compare=previous`,
      '/reports/top-products?period=today',
      '/reports/payment-methods?period=today',
    ]) {
      const res = await call('GET', path, cashier).expect(200);
      const keys = keysOf(res.body);
      for (const field of ['profit', 'cogs', 'grossProfit', 'netProfit']) {
        expect(keys).not.toContain(field);
      }
    }
    await call('GET', `/reports/pnl?from=${today}&to=${today}`, cashier).expect(
      403,
    );
    // The figures they may see are the same as the owner's.
    const s = body<{ sales: { value: number } }>(
      await call('GET', '/dashboard/summary?period=today', cashier).expect(200),
    );
    expect(s.sales.value).toBe(11300);
  });

  it('counts a sale by its Lagos day and time, not UTC', async () => {
    const o = await owner();
    const reports = app.get(ReportingRepository);
    const insert = (receipt: number, createdAt: string, total: number) =>
      db.query(
        `INSERT INTO "sales" ("businessId", "receiptNumber", "subtotal", "discountAmount",
           "vatAmount", "total", "paymentMethod", "status", "saleDate", "soldBy",
           "discountPercent", "createdAt")
         VALUES ($1, $2, $3, 0, 0, $3, 'cash', 'completed',
           ($4::timestamptz AT TIME ZONE 'Africa/Lagos')::date, $1, 0, $4)`,
        [o.id, receipt, total * 100, createdAt],
      );
    // 00:30 and 23:50 on 10 January in Lagos.
    await insert(1, '2026-01-09T23:30:00Z', 1000);
    await insert(2, '2026-01-10T22:50:00Z', 500);

    const day = { from: '2026-01-10', to: '2026-01-10' };
    expect((await reports.totals(o.id, day)).sales).toBe(1500);
    expect(
      (await reports.totals(o.id, { from: '2026-01-09', to: '2026-01-09' }))
        .sales,
    ).toBe(0);
    // A comparison up to 01:00 counts the 00:30 sale only.
    expect((await reports.totals(o.id, day, '01:00:00')).sales).toBe(1000);
  });
});
