import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

// Called by the Employee Call app right after login (and whenever Firebase
// rotates the device's token) so the ERP knows which phone to push a
// "dial this lead" command to when someone clicks Call from the web app.
export async function POST(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing API token" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { apiToken: token } });
  if (!user) {
    return NextResponse.json({ error: "Invalid API token" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const fcmToken = body?.fcmToken;
  if (typeof fcmToken !== "string" || !fcmToken) {
    return NextResponse.json({ error: "Missing fcmToken" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { fcmToken } });

  return NextResponse.json({ ok: true });
}
