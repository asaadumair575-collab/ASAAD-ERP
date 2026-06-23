import type { NextRequest } from "next/server";

export function proxy(_request: NextRequest) {}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
