import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicApiRateLimit } from "@/lib/publicApiRateLimit";
import { timingSafeEqualStr } from "@/lib/timingSafeEqual";

// GET /api/public/orders/{orderId}/tracking?phone=03001234567
// Headers: X-Api-Key: <ORDER_INTAKE_API_KEY>
// Requires the order's phone number to prevent order-id enumeration —
// looking up an id alone is not enough to reveal the tracking number.

function normalizePhone(p: string) {
  return p.replace(/\D/g, "").slice(-10); // last 10 digits, ignores +92/0 prefixes
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const key = process.env.ORDER_INTAKE_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: "Server not configured" }, { status: 500 });
  }
  if (!timingSafeEqualStr(req.headers.get("x-api-key"), key)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const limited = publicApiRateLimit(req);
  if (limited) return NextResponse.json({ ok: false, error: limited }, { status: 429 });

  const { id } = await params;
  const orderId = Number(String(id).replace(/^#/, "").trim());
  const phone = req.nextUrl.searchParams.get("phone");

  if (!orderId || Number.isNaN(orderId) || !phone) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  const order = await prisma.ecomOrder.findUnique({
    where: { id: orderId },
    select: { trackingNumber: true, phone: true },
  });

  if (!order || !order.trackingNumber || !order.phone) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  if (normalizePhone(order.phone) !== normalizePhone(phone)) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, trackingNumber: order.trackingNumber });
}
