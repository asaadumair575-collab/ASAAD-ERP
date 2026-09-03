import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Single lean query — only the fields the scanning screen actually shows.
// No items relation join beyond a short description string, no payments.
export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tracking = req.nextUrl.searchParams.get("tracking")?.trim();
  if (!tracking) return NextResponse.json({ error: "tracking is required" }, { status: 400 });

  const order = await prisma.ecomOrder.findFirst({
    where: { trackingNumber: tracking },
    select: {
      id: true,
      customerName: true,
      phone: true,
      city: true,
      totalAmount: true,
      packedAt: true,
      items: { select: { description: true, quantity: true }, take: 5 },
    },
  });

  if (!order) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    order: {
      id: order.id,
      customerName: order.customerName,
      phone: order.phone,
      city: order.city,
      amount: order.totalAmount,
      items: order.items.map((i) => `${i.description} x${i.quantity}`).join(", "),
      alreadyPacked: !!order.packedAt,
      packedAt: order.packedAt,
    },
  });
}
