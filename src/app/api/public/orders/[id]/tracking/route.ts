import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/public/orders/{orderId}/tracking
// Headers: X-Api-Key: <ORDER_INTAKE_API_KEY>
// Looks up the PostEx tracking number for an ERP order id (e.g. 5354, or "#5354").

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const key = process.env.ORDER_INTAKE_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: "Server not configured" }, { status: 500 });
  }
  if (req.headers.get("x-api-key") !== key) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orderId = Number(String(id).replace(/^#/, "").trim());
  if (!orderId || Number.isNaN(orderId)) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  const order = await prisma.ecomOrder.findUnique({
    where: { id: orderId },
    select: { trackingNumber: true },
  });

  if (!order || !order.trackingNumber) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, trackingNumber: order.trackingNumber });
}
