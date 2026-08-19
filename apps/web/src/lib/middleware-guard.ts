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
 * opaque `luxa_auth` marker cookie. Real validation stays client-side.
 */
export function shouldAllow(pathname: string, hasAuthCookie: boolean): boolean {
  if (isPublicPath(pathname)) return true;
  return hasAuthCookie;
}