/**
 * The API's readable CSRF cookie (see apps/backend/src/common/http/cookies.ts).
 * It exists exactly while a session does, so the edge uses it as the marker.
 */
export const AUTH_COOKIE_NAME = "luxa_csrf";

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api")
  );
}

/**
 * Middleware guard. Public routes always pass; every other route needs the
 * `luxa_csrf` session marker cookie. That is all the edge does.
 *
 * The access split (standard for T11):
 * - Edge: the `luxa_csrf` cookie only suggests "a session exists" and is used
 *   for the redirect-to-login UX. It is role-blind on purpose.
 * - Client: real role/permission enforcement lives in the `RouteGuard`
 *   (src/lib/route-guards.ts), which decides per-route who may enter and
 *   shows AccessDenied otherwise.
 *
 * The cookie is script-readable and trivially forgeable, so the edge never
 * makes an access decision on it. The API is the authority: every request is
 * checked against the httpOnly session cookies.
 */
export function shouldAllow(pathname: string, hasAuthCookie: boolean): boolean {
  if (isPublicPath(pathname)) return true;
  return hasAuthCookie;
}