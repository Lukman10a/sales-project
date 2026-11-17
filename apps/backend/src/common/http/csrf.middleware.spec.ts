import type { Request, Response } from 'express';
import { csrfProtection } from './csrf.middleware';

const ORIGIN = 'https://app.luxa.app';
const guard = csrfProtection([ORIGIN]);

function run(req: Partial<Request> & { headers: Record<string, string> }) {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  guard(
    { method: 'POST', path: '/sales', ...req } as unknown as Request,
    res as unknown as Response,
    next,
  );
  return { res, next };
}

const sessionCookies = '__Host-luxa_at=jwt; luxa_csrf=tok123';

describe('csrfProtection', () => {
  it('lets safe methods through untouched', () => {
    const { next } = run({
      method: 'GET',
      headers: { cookie: sessionCookies },
    });
    expect(next).toHaveBeenCalled();
  });

  it('rejects an unsafe request from a foreign origin', () => {
    const { res, next } = run({ headers: { origin: 'https://evil.example' } });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('lets bearer-only requests without cookies or origin through', () => {
    const { next } = run({ headers: { authorization: 'Bearer x' } });
    expect(next).toHaveBeenCalled();
  });

  it('accepts a cookie request with an allowed origin and matching token', () => {
    const { next } = run({
      headers: {
        origin: ORIGIN,
        cookie: sessionCookies,
        'x-csrf-token': 'tok123',
      },
    });
    expect(next).toHaveBeenCalled();
  });

  it.each([
    ['missing header', { origin: ORIGIN, cookie: sessionCookies }],
    [
      'wrong token',
      { origin: ORIGIN, cookie: sessionCookies, 'x-csrf-token': 'nope' },
    ],
    [
      'no csrf cookie',
      { origin: ORIGIN, cookie: 'luxa_rt=r', 'x-csrf-token': 'tok123' },
    ],
    ['no origin', { cookie: sessionCookies, 'x-csrf-token': 'tok123' }],
  ])('rejects a cookie request with %s', (_label, headers) => {
    const { res, next } = run({ headers });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('skips the token check for login so stale cookies never block sign-in', () => {
    const { next } = run({
      path: '/auth/login',
      headers: { origin: ORIGIN, cookie: sessionCookies },
    });
    expect(next).toHaveBeenCalled();
  });
});
