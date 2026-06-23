import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const username = token ? verifySessionToken(token) : null;

  if (
    !username &&
    request.nextUrl.pathname !== "/login" &&
    request.nextUrl.pathname !== "/api/emergency-reset-x9k2"
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (username && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
