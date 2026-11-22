import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import type { Mailer, MailMessage } from '../src/mail/mailer';
import { totpAt } from '../src/auth/two-factor/totp';

// Two-step verification end to end against a real, disposable Postgres
// (TEST_DATABASE_URL; skipped otherwise).
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

interface Challenge {
  mfaRequired: true;
  challenge: string;
}

suite('Two-step verification (e2e, real Postgres)', () => {
  jest.setTimeout(30_000);
  let app: INestApplication<App>;
  let db: DataSource;
  let seq = 0;
  let ipSeq = 0;
  const email = () => `mfa-${Date.now()}-${seq++}@e2e.luxa.test`;
  const ip = () => `10.2.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

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
  const post = (path: string, jar: Jar = {}) => {
    const req = http()
      .post(path)
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', ip())
      .set('Cookie', cookieHeader(jar));
    return jar.luxa_csrf ? req.set('x-csrf-token', jar.luxa_csrf) : req;
  };
  const get = (path: string, jar: Jar) =>
    http()
      .get(path)
      .set('X-Forwarded-For', ip())
      .set('Cookie', cookieHeader(jar));

  /** Signs up an owner and turns 2FA on. Returns the secret and backup codes. */
  async function enrolledOwner() {
    const address = email();
    const signup = await post('/auth/register')
      .send({
        email: address,
        password: PASSWORD,
        firstName: 'Ada',
        lastName: 'Lovelace',
        businessName: 'Two Step Shop',
      })
      .expect(201);
    const jar = cookiesOf(signup);
    const body = signup.body as { user: Record<string, unknown> };
    // New businesses require 2FA for owners; nothing is enforced yet (T45).
    expect(body.user.twoFactorRequired).toBe(true);
    expect(body.user.twoFactorSetupRequired).toBe(true);

    const setup = await post('/auth/2fa/setup', jar).expect(200);
    const { secret, otpauthUri } = setup.body as {
      secret: string;
      otpauthUri: string;
    };
    expect(otpauthUri).toMatch(/^otpauth:\/\/totp\/LUXA/);

    const enabled = await post('/auth/2fa/enable', jar)
      .send({ code: totpAt(secret, Date.now()) })
      .expect(200);
    const { backupCodes } = enabled.body as { backupCodes: string[] };
    expect(backupCodes).toHaveLength(10);
    return { email: address, secret, backupCodes };
  }

  const passwordStep = async (address: string, remember = false) => {
    const res = await post('/auth/login')
      .send({ email: address, password: PASSWORD, remember })
      .expect(200);
    return res;
  };

  it('stores the secret as ciphertext', async () => {
    const { email: address, secret } = await enrolledOwner();
    const [row] = await db.query<Array<{ twoFactorSecret: string }>>(
      `SELECT "twoFactorSecret" FROM users WHERE email = $1`,
      [address],
    );
    expect(row.twoFactorSecret).toMatch(/^v1\./);
    expect(row.twoFactorSecret).not.toContain(secret);

    const codes = await db.query<unknown[]>(
      `SELECT "codeHash" FROM two_factor_backup_codes c JOIN users u ON u.id = c."userId" WHERE u.email = $1`,
      [address],
    );
    expect(codes).toHaveLength(10);
  });

  it('reaches no protected route until the code is verified', async () => {
    const { email: address, secret } = await enrolledOwner();

    const res = await passwordStep(address);
    const body = res.body as Challenge;
    expect(body.mfaRequired).toBe(true);
    expect(body).not.toHaveProperty('user');
    const jar = cookiesOf(res);
    expect(Object.keys(jar)).toHaveLength(0);

    // Neither the (empty) cookie jar nor the challenge itself gets in.
    await get('/auth/me', jar).expect(401);
    await http()
      .get('/auth/me')
      .set('Authorization', `Bearer ${body.challenge}`)
      .expect(401);
    await http()
      .get('/inventory')
      .set('Authorization', `Bearer ${body.challenge}`)
      .expect(401);

    await post('/auth/2fa/verify')
      .send({ challenge: body.challenge, code: '000000' })
      .expect(401);

    // The code from enabling was spent; the next step's code is fresh.
    const verified = await post('/auth/2fa/verify')
      .send({
        challenge: body.challenge,
        code: totpAt(secret, Date.now() + 30_000),
      })
      .expect(200);
    const session = cookiesOf(verified);
    const me = await get('/auth/me', session).expect(200);
    expect((me.body as { email: string }).email).toBe(address);
    expect((me.body as { twoFactorEnabled: boolean }).twoFactorEnabled).toBe(
      true,
    );
  });

  it('accepts each backup code once', async () => {
    const { email: address, backupCodes } = await enrolledOwner();
    const [code] = backupCodes;

    const first = (await passwordStep(address)).body as Challenge;
    await post('/auth/2fa/verify')
      .send({ challenge: first.challenge, code: code.toUpperCase() })
      .expect(200);

    const second = (await passwordStep(address)).body as Challenge;
    await post('/auth/2fa/verify')
      .send({ challenge: second.challenge, code })
      .expect(401);
    // Another unused code still works.
    await post('/auth/2fa/verify')
      .send({ challenge: second.challenge, code: backupCodes[1] })
      .expect(200);
  });

  it('locks the account after five wrong codes, like wrong passwords', async () => {
    const { email: address, secret } = await enrolledOwner();
    const { challenge } = (await passwordStep(address)).body as Challenge;

    for (let i = 0; i < 5; i++) {
      await post('/auth/2fa/verify')
        .send({ challenge, code: '000000' })
        .expect(401);
    }
    // Locked: even the right code and the right password are refused.
    await post('/auth/2fa/verify')
      .send({ challenge, code: totpAt(secret, Date.now() + 30_000) })
      .expect(401);
    await post('/auth/login')
      .send({ email: address, password: PASSWORD })
      .expect(401);
  });

  it('keeps a trusted device signed in across refresh without a new code', async () => {
    const { email: address, secret } = await enrolledOwner();
    const { challenge } = (await passwordStep(address, true)).body as Challenge;
    const verified = await post('/auth/2fa/verify')
      .send({ challenge, code: totpAt(secret, Date.now() + 30_000) })
      .expect(200);
    const jar = cookiesOf(verified);

    const refreshed = await post('/auth/refresh', jar).expect(200);
    cookiesOf(refreshed, jar);
    await get('/auth/me', jar).expect(200);

    // A new device (no cookies) is asked again.
    const again = (await passwordStep(address)).body as Challenge;
    expect(again.mfaRequired).toBe(true);
  });

  it('signs in without a code once 2FA is turned off', async () => {
    const { email: address, backupCodes } = await enrolledOwner();
    const { challenge } = (await passwordStep(address)).body as Challenge;
    const jar = cookiesOf(
      await post('/auth/2fa/verify')
        .send({ challenge, code: backupCodes[0] })
        .expect(200),
    );

    await post('/auth/2fa/disable', jar)
      .send({ password: 'Wrong-password-1', code: backupCodes[1] })
      .expect(400);
    await post('/auth/2fa/disable', jar)
      .send({ password: PASSWORD, code: backupCodes[1] })
      .expect(200);

    const res = await passwordStep(address);
    expect(res.body).toHaveProperty('user');
    expect(res.body).not.toHaveProperty('mfaRequired');
    const codesLeft = await db.query<unknown[]>(
      `SELECT 1 FROM two_factor_backup_codes c JOIN users u ON u.id = c."userId" WHERE u.email = $1`,
      [address],
    );
    expect(codesLeft).toHaveLength(0);
  });
});
