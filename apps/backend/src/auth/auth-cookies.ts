import { randomBytes } from 'node:crypto';
import type { CookieOptions, Response } from 'express';
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
} from '../common/http/cookies';

export interface SessionCookies {
  accessToken: string;
  refreshToken: string;
  persistent: boolean;
  expiresAt: Date;
}

export interface CookieSettings {
  /** Parent domain shared by app. and api. (e.g. luxa.app). Unset: host-only. */
  domain?: string;
  /** Access cookie lifetime, matching the JWT expiry. */
  accessMaxAgeMs: number;
}

const UNITS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses a JWT-style duration ("15m", "1h", "900") into milliseconds. */
export function durationMs(value: string | undefined, fallbackMs: number) {
  const match = value?.trim().match(/^(\d+)\s*([smhd])?$/);
  if (!match) return fallbackMs;
  return Number(match[1]) * (match[2] ? UNITS[match[2]] : 1000);
}

const BASE: CookieOptions = { secure: true, sameSite: 'lax' };

// `__Host-` cookies must be host-only with path '/', so no domain here.
const accessOptions = (): CookieOptions => ({
  ...BASE,
  httpOnly: true,
  path: '/',
});
const refreshOptions = (): CookieOptions => ({
  ...BASE,
  httpOnly: true,
  path: REFRESH_COOKIE_PATH,
});
const csrfOptions = (s: CookieSettings): CookieOptions => ({
  ...BASE,
  httpOnly: false,
  path: '/',
  ...(s.domain ? { domain: s.domain } : {}),
});

/**
 * Writes the access, refresh and CSRF cookies. A trusted device gets cookies
 * that outlive the browser (until the session expires). Otherwise the refresh
 * and CSRF cookies end when the browser closes.
 */
export function writeSessionCookies(
  res: Response,
  session: SessionCookies,
  settings: CookieSettings,
): void {
  const lifetime: CookieOptions = session.persistent
    ? { expires: session.expiresAt }
    : {};
  res.cookie(ACCESS_COOKIE, session.accessToken, {
    ...accessOptions(),
    maxAge: settings.accessMaxAgeMs,
  });
  res.cookie(REFRESH_COOKIE, session.refreshToken, {
    ...refreshOptions(),
    ...lifetime,
  });
  res.cookie(CSRF_COOKIE, randomBytes(24).toString('base64url'), {
    ...csrfOptions(settings),
    ...lifetime,
  });
}

export function clearSessionCookies(
  res: Response,
  settings: CookieSettings,
): void {
  res.clearCookie(ACCESS_COOKIE, accessOptions());
  res.clearCookie(REFRESH_COOKIE, refreshOptions());
  res.clearCookie(CSRF_COOKIE, csrfOptions(settings));
}
