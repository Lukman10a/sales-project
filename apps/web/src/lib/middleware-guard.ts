export const AUTH_COOKIE_NAME = "luxa_auth";

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api")
  );
}

/**
 * Middleware guard. Public routes always pass; every other route needs the
 * opaque `luxa_auth` marker cookie. That is all the edge does.
 *
 * The access split (standard for T11):
 * - Edge: the `luxa_auth` cookie only proves "a session exists" and is used
 *   for the redirect-to-login UX. It is role-blind on purpose.
 * - Client: real role/permission enforcement lives in the `RouteGuard`
 *   (src/lib/route-guards.ts), which decides per-route who may enter and
 *   shows AccessDenied otherwise.
 *
 * A role hint is deliberately NOT embedded in the cookie value: the cookie is
 * set client-side and is trivially forgeable, so the edge must never make an
 * access decision on it. Keep it an opaque boolean marker.
 */
export function shouldAllow(pathname: string, hasAuthCookie: boolean): boolean {
  if (isPublicPath(pathname)) return true;
  return hasAuthCookie;
}