import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const username = token ? verifySessionToken(token) : null;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const next = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  if (pathname.startsWith("/api/shopify/")) {
    return next();
  }

  if (pathname === "/login") {
    if (username) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return next();
  }

  if (!username) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
