import { randomUUID } from 'node:crypto';
import { RequestMethod, type INestApplication } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import type { Mailer, MailMessage } from '../src/mail/mailer';
import { Notification } from '../src/entities/notification.entity';

// Tenant isolation end to end (T33): business B calls every route that takes
// a resource id with business A's ids, and must get 404 every time, without
// changing anything of A's. Routes come from Nest's own metadata, so a new
// route with a parameter fails this suite until it has a fixture here.
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

interface Route {
  method: string;
  path: string;
}

/** Every HTTP route the app serves, read from controller metadata. */
function routesOf(app: INestApplication): Route[] {
  const routes: Route[] = [];
  const join = (...parts: string[]) =>
    '/' +
    parts
      .flatMap((p) => p.split('/'))
      .filter(Boolean)
      .join('/');
  for (const mod of app.get(ModulesContainer).values()) {
    for (const wrapper of mod.controllers.values()) {
      const type = wrapper.metatype as (new () => object) | null;
      if (!type) continue;
      const base = [Reflect.getMetadata(PATH_METADATA, type) ?? '']
        .flat()
        .map(String);
      const proto = type.prototype as Record<string, unknown>;
      for (const name of Object.getOwnPropertyNames(proto)) {
        const handler = proto[name];
        if (name === 'constructor' || typeof handler !== 'function') continue;
        const verb = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        if (verb === undefined) continue;
        const paths = [Reflect.getMetadata(PATH_METADATA, handler) ?? '']
          .flat()
          .map(String);
        for (const b of base) {
          for (const p of paths) {
            routes.push({ method: RequestMethod[verb], path: join(b, p) });
          }
        }
      }
    }
  }
  return routes;
}

suite('Tenant isolation (e2e, real Postgres)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication<App>;
  let db: DataSource;
  let seq = 0;
  let ipSeq = 0;
  const email = () => `tenant-${Date.now()}-${seq++}@e2e.luxa.test`;
  const ip = () => `10.3.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

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
    const verb = method.toLowerCase() as
      'get' | 'post' | 'patch' | 'put' | 'delete';
    const req = http()
      [verb](path)
      .set('Idempotency-Key', randomUUID())
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', ip())
      .set('Cookie', cookieHeader(jar));
    return jar.luxa_csrf ? req.set('x-csrf-token', jar.luxa_csrf) : req;
  };

  async function owner(businessName: string) {
    const res = await call('POST', '/auth/register', {})
      .send({
        email: email(),
        password: PASSWORD,
        firstName: 'Ada',
        lastName: 'Lovelace',
        businessName,
      })
      .expect(201);
    const body = res.body as { user: { id: string } };
    return { jar: cookiesOf(res), id: body.user.id };
  }

  async function signIn(address: string, password: string) {
    const res = await call('POST', '/auth/login', {})
      .send({ email: address, password })
      .expect(200);
    return cookiesOf(res);
  }

  const bodyOf = <T>(res: request.Response) => res.body as T;

  /** Business A with one of everything that has an id. */
  async function businessWithData() {
    const a = await owner('Shop A');
    const product = bodyOf<{ id: string }>(
      await call('POST', '/inventory', a.jar)
        .send({
          name: 'Rice 50kg',
          sellingPrice: 100,
          costPrice: 60,
          quantity: 10,
          reorderPoint: 20,
        })
        .expect(201),
    );
    const sale = bodyOf<{ id: string }>(
      await call('POST', '/sales', a.jar)
        .send({
          items: [{ productId: product.id, quantity: 1 }],
          paymentMethod: 'cash',
        })
        .expect(201),
    );
    const held = bodyOf<{ id: string }>(
      await call('POST', '/sales/held', a.jar)
        .send({
          customerName: 'Walk-in',
          items: [{ productId: product.id, quantity: 1 }],
        })
        .expect(201),
    );
    const report = bodyOf<{ id: string }>(
      await call('POST', '/reports', a.jar)
        .send({
          name: 'Week',
          type: 'sales',
          format: 'pdf',
          dateRange: { start: '2026-01-01', end: '2026-12-31' },
        })
        .expect(201),
    );
    const invite = bodyOf<{
      id: string;
      email: string;
      temporaryPassword: string;
    }>(
      await call('POST', '/team', a.jar)
        .send({ email: email(), name: 'Kelechi Musa', role: 'cashier' })
        .expect(201),
    );
    const notification = await db.getRepository(Notification).save({
      businessId: a.id,
      userId: a.id,
      type: 'system',
      title: 'Hello',
      message: 'Only for A',
    });
    const expense = bodyOf<{ id: string }>(
      await call('POST', '/expenses', a.jar)
        .send({ category: 'rent', amount: 250000, date: '2026-11-01' })
        .expect(201),
    );
    const insights = bodyOf<Array<{ id: string }>>(
      await call('GET', '/insights', a.jar).expect(200),
    );
    const sessions = bodyOf<Array<{ id: string }>>(
      await call('GET', '/auth/sessions', a.jar).expect(200),
    );
    expect(insights.length).toBeGreaterThan(0);
    return {
      a,
      invite,
      ids: {
        '/inventory/:id': product.id,
        '/sales/:id': sale.id,
        '/sales/held/:id': held.id,
        '/reports/:id': report.id,
        '/team/:id': invite.id,
        '/notifications/:id': notification.id,
        '/insights/:id': insights[0].id,
        '/auth/sessions/:id': sessions[0].id,
        '/expenses/:id': expense.id,
      } as Record<string, string>,
      product,
      sale,
      held,
      report,
    };
  }

  /** Smallest valid body for each write route that takes an id. */
  const BODIES: Record<string, object | undefined> = {
    'PATCH /inventory/:id': { reorderPoint: 1 },
    'POST /inventory/:id/restock': { quantity: 1 },
    'POST /inventory/:id/adjust': { delta: -1, reason: 'test' },
    'PATCH /sales/:id/refund': { refundReason: 'test' },
    'PATCH /team/:id': { department: 'Front' },
    'PATCH /team/:id/permissions': { permissions: ['sales.record'] },
    'PATCH /notifications/:id/read': undefined,
    'PATCH /expenses/:id': { amount: 1 },
  };

  it("gives one business a 404 for every other business's id", async () => {
    const { a, ids, product, sale, held, report } = await businessWithData();
    const b = await owner('Shop B');

    const paramRoutes = routesOf(app).filter((r) => r.path.includes('/:'));
    expect(paramRoutes.length).toBeGreaterThan(15);

    const unmapped: string[] = [];
    const leaks: string[] = [];
    for (const route of paramRoutes) {
      const key = `${route.method} ${route.path}`;
      const prefix = Object.keys(ids)
        .filter((p) => route.path.startsWith(p))
        .sort((x, y) => y.length - x.length)[0];
      const hasBody = route.method === 'GET' || route.method === 'DELETE';
      if (!prefix || (!hasBody && !(key in BODIES))) {
        unmapped.push(key);
        continue;
      }
      const path = route.path.replace(':id', ids[prefix]);
      const req = call(route.method, path, b.jar);
      const res = await (BODIES[key] ? req.send(BODIES[key]) : req);
      if (res.status !== 404) leaks.push(`${key} -> ${res.status}`);
    }

    expect(unmapped).toEqual([]);
    expect(leaks).toEqual([]);

    // Nothing of A's changed.
    const item = bodyOf<{ quantity: number }>(
      await call('GET', `/inventory/${product.id}`, a.jar).expect(200),
    );
    expect(item.quantity).toBe(9);
    const saleNow = bodyOf<{ status: string }>(
      await call('GET', `/sales/${sale.id}`, a.jar).expect(200),
    );
    expect(saleNow.status).toBe('completed');
    await call('GET', `/reports/${report.id}`, a.jar).expect(200);
    const heldNow = bodyOf<Array<{ id: string }>>(
      await call('GET', '/sales/held', a.jar).expect(200),
    );
    expect(heldNow.map((h) => h.id)).toContain(held.id);
    await call('GET', `/team/${ids['/team/:id']}`, a.jar).expect(200);
    await call('GET', '/auth/me', a.jar).expect(200);
    const expenseNow = bodyOf<{ amount: number }>(
      await call('GET', `/expenses/${ids['/expenses/:id']}`, a.jar).expect(200),
    );
    expect(expenseNow.amount).toBe(250000);
  });

  it('records expenses with an audit trail, totals and permission checks', async () => {
    const { a, invite } = await businessWithData();
    const fuel = bodyOf<{ id: string; amount: number; date: string }>(
      await call('POST', '/expenses', a.jar)
        .send({
          category: 'fuel',
          amount: 15000.5,
          date: '2026-11-20',
          note: 'Diesel',
        })
        .expect(201),
    );
    expect(fuel).toMatchObject({ amount: 15000.5, date: '2026-11-20' });
    // Outside the range below.
    await call('POST', '/expenses', a.jar)
      .send({ category: 'fuel', amount: 999, date: '2026-12-01' })
      .expect(201);
    await call('PATCH', `/expenses/${fuel.id}`, a.jar)
      .send({ amount: 16000 })
      .expect(200);

    const summary = bodyOf<{
      total: number;
      byCategory: Array<{ category: string; amount: number }>;
      series: Array<{ period: string; amount: number }>;
    }>(
      await call(
        'GET',
        '/expenses/summary?from=2026-11-01&to=2026-11-30&groupBy=day',
        a.jar,
      ).expect(200),
    );
    expect(summary.total).toBe(266000);
    expect(summary.byCategory).toEqual([
      { category: 'rent', amount: 250000 },
      { category: 'fuel', amount: 16000 },
    ]);
    expect(summary.series).toEqual([
      { period: '2026-11-01', amount: 250000 },
      { period: '2026-11-20', amount: 16000 },
    ]);

    const list = bodyOf<{
      data: Array<{ id: string }>;
      pagination: { total: number };
    }>(
      await call(
        'GET',
        '/expenses?from=2026-11-01&to=2026-11-30&category=fuel',
        a.jar,
      ).expect(200),
    );
    expect(list.data.map((e) => e.id)).toEqual([fuel.id]);

    await call('DELETE', `/expenses/${fuel.id}`, a.jar).expect(200);
    await call('GET', `/expenses/${fuel.id}`, a.jar).expect(404);

    const audit = bodyOf<{
      data: Array<{
        action: string;
        before: { amount?: number } | null;
        after: { amount?: number } | null;
      }>;
    }>(await call('GET', '/audit?entityType=expense', a.jar).expect(200));
    const actions = audit.data.map((e) => e.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'expense.recorded',
        'expense.updated',
        'expense.deleted',
      ]),
    );
    const edit = audit.data.find((e) => e.action === 'expense.updated');
    expect(edit?.before?.amount).toBe(15000.5);
    expect(edit?.after?.amount).toBe(16000);

    // A cashier holds neither expenses.manage nor reports.view_profit.
    const cashier = await signIn(invite.email, invite.temporaryPassword);
    await call('GET', '/expenses', cashier).expect(403);
    await call(
      'GET',
      '/expenses/summary?from=2026-11-01&to=2026-11-30',
      cashier,
    ).expect(403);
    await call('POST', '/expenses', cashier)
      .send({ category: 'other', amount: 1 })
      .expect(403);

    // Granting the permission lets them in on the next request.
    await call('PATCH', `/team/${invite.id}/permissions`, a.jar)
      .send({ permissions: ['sales.record', 'expenses.manage'] })
      .expect(200);
    await call('POST', '/expenses', cashier)
      .send({ category: 'other', amount: 1 })
      .expect(201);
  });

  it('applies a permission change on the very next request', async () => {
    const { a, invite, ids } = await businessWithData();
    const cashier = await signIn(invite.email, invite.temporaryPassword);
    const me = bodyOf<{ role: string; permissions: string[] }>(
      await call('GET', '/auth/me', cashier).expect(200),
    );
    expect(me).toMatchObject({
      role: 'cashier',
      permissions: ['sales.record'],
    });

    // Cashier preset: can sell, cannot refund, discount, or see reports.
    await call('GET', '/sales', cashier).expect(200);
    await call('PATCH', `/sales/${ids['/sales/:id']}/refund`, cashier)
      .send({ refundReason: 'test' })
      .expect(403);
    await call('GET', '/reports', cashier).expect(403);
    await call('GET', '/team', cashier).expect(403);

    // Revoke selling: the same access token is refused straight away.
    await call('PATCH', `/team/${invite.id}/permissions`, a.jar)
      .send({ permissions: [] })
      .expect(200);
    await call('GET', '/sales', cashier).expect(403);

    // Grant it back with a discount allowance.
    await call('PATCH', `/team/${invite.id}/permissions`, a.jar)
      .send({
        permissions: ['sales.record', 'sales.discount'],
        maxDiscountPercent: 5,
      })
      .expect(200);
    const product = ids['/inventory/:id'];
    const sell = (discountPercent: number) =>
      call('POST', '/sales', cashier).send({
        items: [{ productId: product, quantity: 1 }],
        paymentMethod: 'cash',
        discountPercent,
      });
    await sell(5).expect(201);
    await sell(6).expect(403);

    // Deactivate: every request is refused, including a token refresh.
    await call('PATCH', `/team/${invite.id}`, a.jar)
      .send({ status: 'inactive' })
      .expect(200);
    await call('GET', '/auth/me', cashier).expect(401);
    await call('POST', '/auth/refresh', cashier).expect(401);
  });

  it('keeps staff from changing their own access', async () => {
    const { a, invite } = await businessWithData();
    // Promote to manager with staff.manage, then try to self-escalate.
    await call('PATCH', `/team/${invite.id}`, a.jar)
      .send({ role: 'manager' })
      .expect(200);
    await call('PATCH', `/team/${invite.id}/permissions`, a.jar)
      .send({ permissions: ['sales.record', 'staff.manage'] })
      .expect(200);
    const manager = await signIn(invite.email, invite.temporaryPassword);

    await call('PATCH', `/team/${invite.id}/permissions`, manager)
      .send({ permissions: ['sales.record', 'staff.manage', 'billing.manage'] })
      .expect(403);
    await call('POST', '/team', manager)
      .send({
        email: email(),
        name: 'New Hire',
        role: 'cashier',
        permissions: ['reports.view_profit'],
      })
      .expect(403);
    await call('POST', '/team', manager)
      .send({ email: email(), name: 'New Hire', role: 'cashier' })
      .expect(201);
  });
});
