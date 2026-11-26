import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages needing a signed-in account live under /user, admin pages under /admin; any
// other path is public. These checks only look for a session cookie (fast redirect);
// the pages and the API still verify the session itself.
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/forgot-password", "/admin/otp", "/admin/reset-password"]);

const hasCookie = (request: NextRequest, ...names: string[]) => names.some((name) => Boolean(request.cookies.get(name)?.value));

function redirectToLogin(request: NextRequest, loginPath: string, next?: string) {
  const loginUrl = new URL(loginPath, request.url);
  if (next) loginUrl.searchParams.set("next", next);
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedInUser = hasCookie(request, "asia_user_token", "asia_user_refresh_token");

  if (pathname === "/") return NextResponse.redirect(new URL(signedInUser ? "/user" : "/login", request.url));

  if (pathname === "/user" || pathname.startsWith("/user/")) {
    if (signedInUser) return NextResponse.next();
    return redirectToLogin(request, "/login", pathname === "/user" ? undefined : `${pathname}${search}`);
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();
  if (hasCookie(request, "asia_admin_token", "asia_admin_refresh_token")) return NextResponse.next();
  return redirectToLogin(request, "/admin/login", pathname);
}

export const config = {
  matcher: ["/", "/user/:path*", "/admin/:path*"],
};
