import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackingNumber, weight, photo } = await req.json();
  const cn = String(trackingNumber ?? "").trim();
  const w = Number(weight);
  if (!cn) return NextResponse.json({ error: "trackingNumber is required" }, { status: 400 });
  if (!w || w <= 0) return NextResponse.json({ error: "weight must be a positive number" }, { status: 400 });
  if (!photo || typeof photo !== "string" || !photo.startsWith("data:image/")) {
    return NextResponse.json({ error: "photo is required" }, { status: 400 });
  }

  const record = await prisma.weightVerification.create({
    data: { trackingNumber: cn, weight: w, photo, verifiedById: me.id },
  });

  // Mark the matching order as packed, if one exists with this tracking number.
  const order = await prisma.ecomOrder.findFirst({ where: { trackingNumber: cn } });
  if (order) {
    await prisma.ecomOrder.update({ where: { id: order.id }, data: { packedAt: new Date() } });
  }

  return NextResponse.json({ ok: true, id: record.id, orderId: order?.id ?? null, orderMatched: !!order });
}
