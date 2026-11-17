/**
 * Session cookie names, shared by the auth controller (which sets them), the
 * JWT strategy (which reads the access cookie) and the CSRF middleware.
 *
 * - ACCESS  `__Host-luxa_at`: short-lived access JWT. HttpOnly, host-only.
 * - REFRESH `luxa_rt`: opaque refresh token. HttpOnly, sent only to the
 *   refresh endpoint.
 * - CSRF    `luxa_csrf`: random double-submit token. Readable by the web app,
 *   which echoes it in `x-csrf-token`. It carries no credential, and the web
 *   middleware also uses its presence as the "a session exists" marker.
 */
export const ACCESS_COOKIE = '__Host-luxa_at';
export const REFRESH_COOKIE = 'luxa_rt';
export const CSRF_COOKIE = 'luxa_csrf';
export const CSRF_HEADER = 'x-csrf-token';
export const REFRESH_COOKIE_PATH = '/auth/refresh';

const decode = (raw: string) => {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

/**
 * Parses a `Cookie` request header. Malformed pairs are skipped. Names are
 * attacker-controlled, so they are collected in a Map and copied with
 * Object.fromEntries (own data properties only): a `__proto__` cookie can
 * never reach a prototype.
 */
export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  const found = new Map<string, string>();
  for (const part of header ? header.split(';') : []) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    if (!name || found.has(name)) continue;
    found.set(name, decode(part.slice(eq + 1).trim()));
  }
  return Object.fromEntries(found);
}
