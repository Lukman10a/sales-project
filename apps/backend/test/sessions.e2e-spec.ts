import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';

// Cookie sessions end to end against a real, disposable Postgres
// (TEST_DATABASE_URL; skipped otherwise). WARNING: the database is migrated
// in place and receives test users.
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

const ORIGIN = 'http://localhost:3000';
type Jar = Record<string, string>;

/** Collects name=value pairs from Set-Cookie headers (empty = cleared). */
function cookiesOf(res: request.Response, into: Jar = {}): Jar {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  for (const line of raw ?? []) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    if (value) into[name] = value;
    else delete into[name];
  }
  return into;
}

const header = (jar: Jar, names = Object.keys(jar)) =>
  names
    .filter((n) => jar[n])
    .map((n) => `${n}=${jar[n]}`)
    .join('; ');

suite('Cookie sessions (e2e, real Postgres)', () => {
  let app: INestApplication<App>;
  const password = 'Password1';
  let seq = 0;
  const email = () => `session-${Date.now()}-${seq++}@e2e.luxa.test`;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.DB_MANUAL_INIT = 'false';
    // Loaded only after the env points at the real database.
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { AppModule } =
      require('../src/app.module') as typeof import('../src/app.module');
    const { configureApp } =
      require('../src/bootstrap') as typeof import('../src/bootstrap');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    await app.get(DataSource).runMigrations();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  async function signUp(): Promise<{ jar: Jar; email: string }> {
    const address = email();
    const res = await http()
      .post('/auth/register')
      .set('Origin', ORIGIN)
      .send({
        email: address,
        password,
        firstName: 'Ada',
        lastName: 'Lovelace',
        businessName: 'Session Shop',
      })
      .expect(201);
    return { jar: cookiesOf(res), email: address };
  }

  async function login(address: string): Promise<Jar> {
    const res = await http()
      .post('/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: address, password })
      .expect(200);
    return cookiesOf(res);
  }

  const me = (jar: Jar) =>
    http()
      .get('/auth/me')
      .set('Cookie', header(jar, ['__Host-luxa_at']));

  const refresh = (jar: Jar) =>
    http()
      .post('/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', header(jar, ['luxa_rt', 'luxa_csrf']))
      .set('x-csrf-token', jar.luxa_csrf);

  const authed = (method: 'post' | 'delete', path: string, jar: Jar) =>
    http()
      [method](path)
      .set('Origin', ORIGIN)
      .set('Cookie', header(jar))
      .set('x-csrf-token', jar.luxa_csrf);

  it('keeps every token out of the body and out of page scripts', async () => {
    const res = await http()
      .post('/auth/register')
      .set('Origin', ORIGIN)
      .send({
        email: email(),
        password,
        firstName: 'Ada',
        lastName: 'Lovelace',
        businessName: 'Session Shop',
      })
      .expect(201);

    expect(JSON.stringify(res.body)).not.toMatch(/token/i);
    const lines = res.headers['set-cookie'] as unknown as string[];
    const byName = (n: string) => lines.find((l) => l.startsWith(`${n}=`))!;
    expect(byName('__Host-luxa_at')).toMatch(/HttpOnly/);
    expect(byName('__Host-luxa_at')).toMatch(/Secure/);
    expect(byName('__Host-luxa_at')).toMatch(/SameSite=Lax/);
    expect(byName('luxa_rt')).toMatch(/HttpOnly/);
    expect(byName('luxa_rt')).toMatch(/Path=\/auth\/refresh/);
    // The only script-readable cookie is the random CSRF token, not a JWT.
    expect(byName('luxa_csrf')).not.toMatch(/HttpOnly/);
    expect(cookiesOf(res).luxa_csrf.split('.')).toHaveLength(1);
  });

  it('authenticates with the access cookie', async () => {
    const { jar, email: address } = await signUp();
    const res = await me(jar).expect(200);
    expect((res.body as { email: string }).email).toBe(address);
  });

  it('rotates the refresh token on every use', async () => {
    const { jar } = await signUp();
    const first = jar.luxa_rt;

    const res = await refresh(jar).expect(200);
    const next = cookiesOf(res, { ...jar });

    expect(next.luxa_rt).toBeDefined();
    expect(next.luxa_rt).not.toBe(first);
    await me(next).expect(200);
  });

  it('revokes the whole family when an old refresh token is reused', async () => {
    const { jar: original } = await signUp();
    const rotated = cookiesOf(await refresh(original).expect(200), {
      ...original,
    });

    // The attacker replays the stolen, already-rotated token.
    await refresh(original).expect(401);

    // The legitimate holder's newer tokens are dead too.
    await refresh(rotated).expect(401);
    await me(rotated).expect(401);
  });

  it('logout invalidates the session immediately', async () => {
    const { jar } = await signUp();
    await me(jar).expect(200);

    await authed('post', '/auth/logout', jar).expect(200);

    // The old access cookie is still unexpired, but its session is gone.
    await me(jar).expect(401);
    await refresh(jar).expect(401);
  });

  it('refuses cookie requests without the CSRF header', async () => {
    const { jar } = await signUp();
    await http()
      .post('/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', header(jar))
      .expect(403);
    await http()
      .post('/auth/logout')
      .set('Origin', 'https://evil.example')
      .set('Cookie', header(jar))
      .set('x-csrf-token', jar.luxa_csrf)
      .expect(403);
    await me(jar).expect(200);
  });

  it('lists devices, signs one out, then signs out everywhere', async () => {
    const { jar: laptop, email: address } = await signUp();
    const phone = await login(address);

    const list = await http()
      .get('/auth/sessions')
      .set('Cookie', header(laptop))
      .expect(200);
    const sessions = list.body as Array<{ id: string; current: boolean }>;
    expect(sessions).toHaveLength(2);
    const other = sessions.find((s) => !s.current)!;
    expect(JSON.stringify(sessions)).not.toMatch(/tokenHash/);

    await authed('delete', `/auth/sessions/${other.id}`, laptop).expect(200);
    await me(phone).expect(401);
    await me(laptop).expect(200);

    const tablet = await login(address);
    await authed('post', '/auth/logout-all', laptop).expect(200);
    await me(laptop).expect(401);
    await me(tablet).expect(401);
  });
});
