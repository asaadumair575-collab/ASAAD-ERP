import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// One round trip: create the weight record and mark the order packed in a
// single transaction. No photo required — this is the fast keyboard-wedge
// scale flow. Returns just enough for the UI to update optimistically.
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackingNumber, weightGrams } = await req.json();
  const cn = String(trackingNumber ?? "").trim();
  const g = Number(weightGrams);
  if (!cn) return NextResponse.json({ error: "trackingNumber is required" }, { status: 400 });
  if (!g || g <= 0) return NextResponse.json({ error: "weight must be a positive number" }, { status: 400 });

  const order = await prisma.ecomOrder.findFirst({
    where: { trackingNumber: cn },
    select: { id: true, packedAt: true },
  });
  if (!order) return NextResponse.json({ error: "Parcel not found" }, { status: 404 });
  if (order.packedAt) {
    return NextResponse.json({ error: "Already processed", packedAt: order.packedAt }, { status: 409 });
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.weightVerification.create({
      data: { trackingNumber: cn, weight: g / 1000, verifiedById: me.id, createdAt: now },
    }),
    prisma.ecomOrder.update({ where: { id: order.id }, data: { packedAt: now } }),
  ]);

  return NextResponse.json({ ok: true, orderId: order.id, time: now.toISOString() });
}
