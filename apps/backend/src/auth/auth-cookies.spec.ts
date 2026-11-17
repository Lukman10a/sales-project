import type { CookieOptions, Response } from 'express';
import {
  clearSessionCookies,
  durationMs,
  writeSessionCookies,
} from './auth-cookies';

function fakeRes() {
  const res = {
    cookie: jest.fn<void, [string, string, CookieOptions]>(),
    clearCookie: jest.fn<void, [string, CookieOptions]>(),
  };
  return res as typeof res & Response;
}

const session = {
  accessToken: 'jwt',
  refreshToken: 'rt',
  persistent: false,
  expiresAt: new Date('2030-01-01T00:00:00Z'),
};

const byName = (res: ReturnType<typeof fakeRes>) =>
  Object.fromEntries(
    res.cookie.mock.calls.map(([name, value, opts]) => [name, { value, opts }]),
  ) as Record<string, { value: string; opts: CookieOptions }>;

describe('durationMs', () => {
  it.each([
    ['15m', 900_000],
    ['1h', 3_600_000],
    ['7d', 604_800_000],
    ['900', 900_000],
    ['soon', 42],
    [undefined, 42],
  ])('%s → %d', (value, ms) => {
    expect(durationMs(value, 42)).toBe(ms);
  });
});

describe('writeSessionCookies', () => {
  it('sets httpOnly secure access and refresh cookies', () => {
    const res = fakeRes();
    writeSessionCookies(res, session, { accessMaxAgeMs: 900_000 });
    const c = byName(res);

    expect(c['__Host-luxa_at']).toEqual({
      value: 'jwt',
      opts: {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 900_000,
      },
    });
    expect(c.luxa_rt.opts).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/auth/refresh',
    });
  });

  it('keeps the access cookie host-only even with a parent domain', () => {
    const res = fakeRes();
    writeSessionCookies(res, session, {
      domain: 'luxa.app',
      accessMaxAgeMs: 1,
    });
    const c = byName(res);
    expect(c['__Host-luxa_at'].opts.domain).toBeUndefined();
    expect(c.luxa_csrf.opts.domain).toBe('luxa.app');
  });

  it('gives the web app a readable, random CSRF token', () => {
    const res = fakeRes();
    writeSessionCookies(res, session, { accessMaxAgeMs: 1 });
    const { luxa_csrf } = byName(res);
    expect(luxa_csrf.opts.httpOnly).toBe(false);
    expect(luxa_csrf.value).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it('uses browser-session cookies unless the device is trusted', () => {
    const brief = fakeRes();
    writeSessionCookies(brief, session, { accessMaxAgeMs: 1 });
    expect(byName(brief).luxa_rt.opts.expires).toBeUndefined();

    const trusted = fakeRes();
    writeSessionCookies(
      trusted,
      { ...session, persistent: true },
      { accessMaxAgeMs: 1 },
    );
    expect(byName(trusted).luxa_rt.opts.expires).toEqual(session.expiresAt);
    expect(byName(trusted).luxa_csrf.opts.expires).toEqual(session.expiresAt);
  });
});

describe('clearSessionCookies', () => {
  it('clears all three cookies on their own paths', () => {
    const res = fakeRes();
    clearSessionCookies(res, { domain: 'luxa.app', accessMaxAgeMs: 1 });
    expect(
      res.clearCookie.mock.calls.map(([n, o]) => [n, o.path, o.domain]),
    ).toEqual([
      ['__Host-luxa_at', '/', undefined],
      ['luxa_rt', '/auth/refresh', undefined],
      ['luxa_csrf', '/', 'luxa.app'],
    ]);
  });
});
