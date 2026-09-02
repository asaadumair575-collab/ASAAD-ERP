import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackingNumber, photo } = await req.json();
  const cn = String(trackingNumber ?? "").trim();
  if (!cn) return NextResponse.json({ error: "trackingNumber is required" }, { status: 400 });
  if (!photo || typeof photo !== "string" || !photo.startsWith("data:image/")) {
    return NextResponse.json({ error: "photo is required" }, { status: 400 });
  }

  const record = await prisma.weightVerification.create({
    data: { trackingNumber: cn, photo, verifiedById: me.id },
  });

  return NextResponse.json({ ok: true, id: record.id });
}
