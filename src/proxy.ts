import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, USER_COOKIE } from "@/lib/session";

// Cheap gate: bounce visitors without a session cookie to the right login.
// Pages still verify the session and the account (expiry, suspension).
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !req.cookies.has(ADMIN_COOKIE)) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (pathname.startsWith("/app") && !req.cookies.has(USER_COOKIE)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/admin/:path*"] };
