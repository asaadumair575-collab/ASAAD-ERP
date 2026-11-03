import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, USER_COOKIE } from "@/lib/session";

// Mirrors OPEN_PREVIEW in src/lib/preview.ts (kept separate so the proxy
// doesn't import the database client).
const OPEN_PREVIEW = process.env.REQUIRE_LOGIN !== "1" && true;

// Cheap gate: bounce visitors without a session cookie to the right login.
// Pages still verify the session and the account (expiry, suspension).
export function proxy(req: NextRequest) {
  if (OPEN_PREVIEW) return NextResponse.next();
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
