import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { shouldAllow, AUTH_COOKIE_NAME } from "@/lib/middleware-guard";

export function middleware(request: NextRequest) {
  if (
    shouldAllow(request.nextUrl.pathname, request.cookies.has(AUTH_COOKIE_NAME))
  ) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/auth/login", request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};