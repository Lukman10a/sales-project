import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import type { Mailer, MailMessage } from '../src/mail/mailer';

// Account security end to end against a real, disposable Postgres
// (TEST_DATABASE_URL; skipped otherwise). Mail is captured in memory.
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

class MemoryMailer implements Mailer {
  readonly sent: MailMessage[] = [];
  send(message: MailMessage) {
    this.sent.push(message);
    return Promise.resolve();
  }
}

suite('Account security (e2e, real Postgres)', () => {
  // Every sign-in runs a cost-12 bcrypt check; several per test add up.
  jest.setTimeout(30_000);
  let app: INestApplication<App>;
  let db: DataSource;
  const mailer = new MemoryMailer();
  let seq = 0;
  let ipSeq = 0;
  const email = () => `acct-${Date.now()}-${seq++}@e2e.luxa.test`;
  // A fresh client IP per request keeps the per-IP rate limits out of the
  // way, except in the test that is about them.
  const ip = () => `10.1.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

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
      .useValue(mailer)
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
  const post = (path: string, from = ip()) =>
    http().post(path).set('Origin', ORIGIN).set('X-Forwarded-For', from);

  async function mailFor(to: string, kind: MailMessage['kind']) {
    for (let i = 0; i < 50; i++) {
      const found = [...mailer.sent]
        .reverse()
        .find((m) => m.to === to && m.kind === kind);
      if (found) return found;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`no ${kind} mail for ${to}`);
  }
  const tokenOf = (m: MailMessage) =>
    new URL(m.link!).searchParams.get('token')!;

  async function signUp(password = PASSWORD) {
    const address = email();
    const res = await post('/auth/register')
      .send({
        email: address,
        password,
        firstName: 'Ada',
        lastName: 'Lovelace',
        businessName: 'Secure Shop',
      })
      .expect(201);
    return { email: address, jar: cookiesOf(res) };
  }

  const login = (address: string, password = PASSWORD, from = ip()) =>
    post('/auth/login', from).send({ email: address, password });

  const me = (jar: Jar) =>
    http().get('/auth/me').set('Cookie', cookieHeader(jar));

  it('rejects a common or short password at sign-up', async () => {
    for (const password of ['qwertyuiop', 'Short-1']) {
      await post('/auth/register')
        .send({
          email: email(),
          password,
          firstName: 'Ada',
          lastName: 'Lovelace',
          businessName: 'Secure Shop',
        })
        .expect(400);
    }
  });

  it('refuses the 6th attempt, even with the right password, after 5 wrong ones', async () => {
    const { email: address } = await signUp();

    for (let i = 0; i < 5; i++) {
      await login(address, 'Wrong-password-1').expect(401);
    }
    const sixth = await login(address).expect(401);
    expect((sixth.body as { message: string }).message).toBe(
      'Invalid credentials',
    );

    const notice = await mailFor(address, 'suspicious-sign-in');
    expect(notice.text).toMatch(/paused for 15 minutes/);

    // Once the lock lapses, the right password works again.
    await db.query(
      `UPDATE users SET "lockedUntil" = now() - interval '1 second' WHERE email = $1`,
      [address],
    );
    await login(address).expect(200);
  });

  it('does not reveal whether an email exists', async () => {
    const unknown = await login('nobody-here@e2e.luxa.test').expect(401);
    const { email: address } = await signUp();
    const wrong = await login(address, 'Wrong-password-1').expect(401);
    expect(unknown.body).toEqual(wrong.body);

    const a = await post('/auth/forgot-password')
      .send({ email: 'nobody-here@e2e.luxa.test' })
      .expect(202);
    const b = await post('/auth/forgot-password')
      .send({ email: address })
      .expect(202);
    expect(a.body).toEqual(b.body);
  });

  it('does not let an inactive user sign in', async () => {
    const { email: address } = await signUp();
    await db.query(`UPDATE users SET status = 'inactive' WHERE email = $1`, [
      address,
    ]);
    const res = await login(address).expect(403);
    expect((res.body as { message: string }).message).toMatch(/deactivated/);
  });

  it('verifies the email with a single-use link; overdue owners are stopped', async () => {
    const { email: address, jar } = await signUp();
    const before = await me(jar).expect(200);
    expect(before.body).toMatchObject({ emailVerified: false });

    await db.query(
      `UPDATE users SET "createdAt" = now() - interval '8 days' WHERE email = $1`,
      [address],
    );
    const blocked = await login(address).expect(403);
    expect((blocked.body as { code: string }).code).toBe('EMAIL_UNVERIFIED');

    const token = tokenOf(await mailFor(address, 'verify-email'));
    await post('/auth/verify-email').send({ token }).expect(200);
    await post('/auth/verify-email').send({ token }).expect(400);

    const res = await login(address).expect(200);
    expect(res.body).toMatchObject({ user: { emailVerified: true } });
  });

  it('resets the password once, signs everyone out, and expires links after 30 minutes', async () => {
    const { email: address, jar } = await signUp();

    await post('/auth/forgot-password').send({ email: address }).expect(202);
    const token = tokenOf(await mailFor(address, 'reset-password'));

    const fresh = 'Fresh-password-77';
    await post('/auth/reset-password')
      .send({ token, password: fresh })
      .expect(200);
    await post('/auth/reset-password')
      .send({ token, password: 'Another-pass-88' })
      .expect(400);

    await me(jar).expect(401);
    await login(address).expect(401);
    await login(address, fresh).expect(200);

    // An expired link is refused.
    mailer.sent.length = 0;
    await post('/auth/forgot-password').send({ email: address }).expect(202);
    const stale = tokenOf(await mailFor(address, 'reset-password'));
    await db.query(
      `UPDATE auth_tokens SET "expiresAt" = now() - interval '1 second'
       WHERE "usedAt" IS NULL AND purpose = 'reset_password'`,
    );
    await post('/auth/reset-password')
      .send({ token: stale, password: 'Too-late-pass-99' })
      .expect(400);
  });

  it('a password change signs out every other device but keeps this one', async () => {
    const { email: address, jar: laptop } = await signUp();
    const phone = cookiesOf(await login(address).expect(200));

    await http()
      .post('/profile/change-password')
      .set('Origin', ORIGIN)
      .set('Cookie', cookieHeader(laptop))
      .set('x-csrf-token', laptop.luxa_csrf)
      .send({ currentPassword: PASSWORD, newPassword: 'Changed-pass-55' })
      .expect(200);

    await me(laptop).expect(200);
    await me(phone).expect(401);
  });

  it('rate-limits sign-in per IP and email', async () => {
    const from = '10.250.0.1';
    const address = 'throttled@e2e.luxa.test';
    for (let i = 0; i < 5; i++) {
      await login(address, 'Wrong-password-1', from).expect(401);
    }
    const res = await login(address, 'Wrong-password-1', from).expect(429);
    expect(res.headers['retry-after']).toMatch(/^\d+$/);
    // A different email from the same IP is unaffected.
    await login('someone-else@e2e.luxa.test', 'x', from).expect(401);
  });
});
