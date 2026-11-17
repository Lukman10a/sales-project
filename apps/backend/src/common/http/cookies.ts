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

/** Parses a `Cookie` request header. Malformed pairs are skipped. */
export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const raw = part.slice(eq + 1).trim();
    if (!name || name in out) continue;
    try {
      out[name] = decodeURIComponent(raw);
    } catch {
      out[name] = raw;
    }
  }
  return out;
}
