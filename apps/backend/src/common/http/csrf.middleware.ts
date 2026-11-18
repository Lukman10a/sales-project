import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  CSRF_HEADER,
  REFRESH_COOKIE,
  parseCookies,
} from './cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Login, signup and the emailed-link flows are not cookie-authenticated, so the double-submit token
// does not apply. A stale cookie must never block someone from signing in.
// The Origin check still stops cross-site login CSRF.
const CREDENTIAL_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/verify-email/resend',
]);

function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * CSRF defence for cookie sessions, applied to every unsafe method:
 * 1. A present `Origin` must be on the allowlist.
 * 2. A cookie-authenticated request must send an allowlisted `Origin` and an
 *    `x-csrf-token` header equal to the `luxa_csrf` cookie (double submit).
 * Bearer-only requests (tests, scripts) carry no cookies and skip step 2.
 */
export function csrfProtection(allowedOrigins: readonly string[]) {
  const allowed = new Set(allowedOrigins);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method)) return next();

    const reject = (message: string) => {
      res.status(403).json({ statusCode: 403, error: 'Forbidden', message });
    };

    const origin = req.headers.origin;
    if (origin !== undefined && !allowed.has(origin)) {
      return reject('Origin not allowed');
    }

    const cookies = parseCookies(req.headers.cookie);
    const cookieAuth = ACCESS_COOKIE in cookies || REFRESH_COOKIE in cookies;
    if (!cookieAuth || CREDENTIAL_PATHS.has(req.path)) return next();

    if (origin === undefined) return reject('Origin header required');

    const header = req.headers[CSRF_HEADER];
    const expected = cookies[CSRF_COOKIE];
    if (
      typeof header !== 'string' ||
      !expected ||
      !sameToken(header, expected)
    ) {
      return reject('CSRF token missing or invalid');
    }
    next();
  };
}
