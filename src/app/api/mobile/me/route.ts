import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

// Lets the Employee Call app validate a token right after the employee
// types it in, instead of only finding out it's wrong on the first call sync.
export async function GET(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing API token" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { apiToken: token } });
  if (!user) {
    return NextResponse.json({ error: "Invalid API token" }, { status: 401 });
  }

  return NextResponse.json({
    username: user.username,
    displayName: user.displayName ?? user.username,
  });
}
