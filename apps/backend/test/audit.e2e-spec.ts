import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import type { Mailer, MailMessage } from '../src/mail/mailer';
import { AuditEvent } from '../src/entities/audit-event.entity';
import { InventoryItem } from '../src/entities/inventory-item.entity';

// The append-only audit trail (T34) against a real database: every write
// leaves exactly one event, an event and its change commit or roll back
// together, and the table refuses UPDATE and DELETE.
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

interface AuditPage {
  data: Array<{ action: string; entityId: string | null; ip: string | null }>;
  nextCursor: string | null;
}

suite('Audit trail (e2e, real Postgres)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication<App>;
  let db: DataSource;
  let seq = 0;
  let ipSeq = 0;
  const email = () => `audit-${Date.now()}-${seq++}@e2e.luxa.test`;
  const ip = () => `10.4.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

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
  const call = (method: string, path: string, jar: Jar, from = ip()) => {
    const verb = method.toLowerCase() as
      'get' | 'post' | 'patch' | 'put' | 'delete';
    const req = http()
      [verb](path)
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', from)
      .set('User-Agent', 'audit-e2e')
      .set('Idempotency-Key', randomUUID())
      .set('Cookie', cookieHeader(jar));
    return jar.luxa_csrf ? req.set('x-csrf-token', jar.luxa_csrf) : req;
  };

  async function owner() {
    const res = await call('POST', '/auth/register', {})
      .send({
        email: email(),
        password: PASSWORD,
        firstName: 'Ada',
        lastName: 'Lovelace',
        businessName: 'Audit Shop',
      })
      .expect(201);
    const body = res.body as { user: { id: string; businessId: string } };
    return { jar: cookiesOf(res), ...body.user };
  }

  const trail = (businessId: string) =>
    db.getRepository(AuditEvent).find({
      where: { businessId },
      order: { createdAt: 'ASC' },
    });

  it('leaves exactly one event per write, newest first over the API', async () => {
    const a = await owner();
    const product = (
      await call('POST', '/inventory', a.jar)
        .send({
          name: 'Rice',
          sellingPrice: 100,
          wholesalePrice: 60,
          quantity: 10,
        })
        .expect(201)
    ).body as { id: string };
    await call('PATCH', `/inventory/${product.id}`, a.jar)
      .send({ sellingPrice: 120 })
      .expect(200);
    const sale = (
      await call('POST', '/sales', a.jar)
        .send({
          items: [{ productId: product.id, quantity: 2 }],
          paymentMethod: 'cash',
        })
        .expect(201)
    ).body as { id: string };
    await call('PATCH', `/sales/${sale.id}/refund`, a.jar)
      .send({ refundReason: 'damaged' })
      .expect(200);
    await call('DELETE', `/inventory/${product.id}`, a.jar).expect(200);

    const events = await trail(a.businessId);
    expect(events.map((e) => e.action)).toEqual([
      'auth.signed_in',
      'product.created',
      'product.price_changed',
      'sale.recorded',
      'sale.refunded',
      'product.deleted',
    ]);
    const price = events[2];
    expect(price).toMatchObject({
      actorUserId: a.id,
      actorName: 'Ada Lovelace',
      entityId: product.id,
      before: { sellingPrice: 100 },
      after: { sellingPrice: 120 },
      userAgent: 'audit-e2e',
    });
    expect(price.ip).toMatch(/^10\.4\./);
    expect(price.sessionId).toEqual(expect.any(String));

    // Cursor pagination, newest first, and filters.
    const first = (await call('GET', '/audit?limit=4', a.jar).expect(200))
      .body as AuditPage;
    expect(first.data.map((e) => e.action)).toEqual([
      'product.deleted',
      'sale.refunded',
      'sale.recorded',
      'product.price_changed',
    ]);
    const rest = (
      await call(
        'GET',
        `/audit?limit=4&cursor=${first.nextCursor ?? ''}`,
        a.jar,
      ).expect(200)
    ).body as AuditPage;
    expect(rest.data.map((e) => e.action)).toEqual([
      'product.created',
      'auth.signed_in',
    ]);
    expect(rest.nextCursor).toBeNull();

    const sales = (
      await call('GET', `/audit?entityType=sale&entityId=${sale.id}`, a.jar)
    ).body as AuditPage;
    expect(sales.data.map((e) => e.action)).toEqual([
      'sale.refunded',
      'sale.recorded',
    ]);

    // The team activity feed reads the same trail.
    const activity = (await call('GET', '/team/activity', a.jar).expect(200))
      .body as { data: Array<{ action: string }> };
    expect(activity.data[0].action).toBe('Deleted Product');
  });

  it('keeps other businesses and staff without staff.manage out', async () => {
    const a = await owner();
    const b = await owner();
    const page = (await call('GET', '/audit', b.jar).expect(200))
      .body as AuditPage;
    expect(page.data.every((e) => e.entityId !== a.id)).toBe(true);

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
    await call('GET', '/audit', cashier).expect(403);
  });

  it('records failed sign-ins against the account', async () => {
    const a = await owner();
    const [address] = await db.query<{ email: string }[]>(
      `SELECT email FROM users WHERE id = $1`,
      [a.id],
    );
    await call('POST', '/auth/login', {})
      .send({ email: address.email, password: 'Wrong-Password-1' })
      .expect(401);
    const events = await trail(a.businessId);
    expect(events.at(-1)).toMatchObject({
      action: 'auth.sign_in_failed',
      after: { reason: 'wrong_password', locked: false },
    });
  });

  it('rolls the change back when its audit event cannot be written', async () => {
    const a = await owner();
    const product = (
      await call('POST', '/inventory', a.jar)
        .send({
          name: 'Beans',
          sellingPrice: 50,
          wholesalePrice: 30,
          quantity: 5,
        })
        .expect(201)
    ).body as { id: string };
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { TransactionRunner, activeManager } =
      require('../src/common/transactions/transactions') as typeof import('../src/common/transactions/transactions');
    const { AuditService } =
      require('../src/audit/audit.service') as typeof import('../src/audit/audit.service');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const runner = app.get(TransactionRunner);
    const audit = app.get(AuditService);
    const products = db.getRepository(InventoryItem);
    const before = (await trail(a.businessId)).length;

    // A change whose audit insert fails: neither survives.
    await expect(
      runner.run(async () => {
        await activeManager()!
          .createQueryBuilder()
          .update(InventoryItem)
          .set({ sellingPrice: 999 })
          .where('id = :id', { id: product.id })
          .execute();
        await audit.record({
          businessId: a.businessId,
          actor: { id: a.id, name: 'Ada' },
          action: 'product.price_changed',
          entityType: 'x'.repeat(51), // longer than the column allows
          entityId: product.id,
        });
      }),
    ).rejects.toThrow();
    expect(
      Number((await products.findOneByOrFail({ id: product.id })).sellingPrice),
    ).toBe(50);

    // A change that fails after its event: the event goes too.
    await expect(
      runner.run(async () => {
        await audit.record({
          businessId: a.businessId,
          actor: { id: a.id, name: 'Ada' },
          action: 'product.updated',
          entityType: 'product',
          entityId: product.id,
        });
        throw new Error('change failed');
      }),
    ).rejects.toThrow('change failed');
    expect(await trail(a.businessId)).toHaveLength(before);
  });

  it('refuses to update or delete audit events', async () => {
    const a = await owner();
    const [event] = await trail(a.businessId);
    await expect(
      db.query(`UPDATE audit_events SET "actorName" = 'x' WHERE id = $1`, [
        event.id,
      ]),
    ).rejects.toThrow(/append-only|permission denied/);
    await expect(
      db.query(`DELETE FROM audit_events WHERE id = $1`, [event.id]),
    ).rejects.toThrow(/append-only|permission denied/);
  });
});
