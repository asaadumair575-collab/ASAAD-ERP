import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const POSTEX_BASE = "https://api.postex.pk/services/integration/api";
const POSTEX_TOKEN = process.env.POSTEX_RETAIL_API_TOKEN ?? "";

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.retailOrder.findUnique({
    where: { id: Number(orderId) },
    select: { id: true, customerName: true, phone: true, city: true, address: true, totalAmount: true, trackingNumber: true, payments: { select: { amount: true } }, items: { select: { description: true, quantity: true } } },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.trackingNumber) {
    return NextResponse.json({ ok: true, tracking: order.trackingNumber, alreadyDispatched: true });
  }

  const invoiceNumber = `R-${String(order.id).padStart(3, "0")}`;
  const advancePaid = order.payments.reduce((s, p) => s + p.amount, 0);
  const codAmount = Math.max(0, order.totalAmount - advancePaid);

  const deliveryAddress = [order.address, order.city].filter(Boolean).join(", ") || (order.city ?? "");
  const orderDetail = order.items.map((i) => `${i.description} x${i.quantity}dz`).join(", ") || invoiceNumber;

  try {
    const res = await fetch(`${POSTEX_BASE}/order/v3/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: POSTEX_TOKEN },
      body: JSON.stringify({
        orderType: "Normal",
        pickupAddressCode: "001",
        orderRefNumber: invoiceNumber,
        cityName: order.city ?? "Karachi",
        customerName: order.customerName,
        customerPhone: order.phone ?? "",
        deliveryAddress,
        invoicePayment: codAmount,
        invoiceNumber: invoiceNumber,
        items: order.items.length || 1,
        orderDetail,
        transactionNotes: invoiceNumber,
      }),
    });

    const data = await res.json();
    console.log("[Retail Postex response]", JSON.stringify(data));

    if (!res.ok || data?.statusCode === false || data?.status === false) {
      return NextResponse.json({ error: data?.statusMessage ?? data?.message ?? `Postex error ${res.status}` }, { status: 400 });
    }

    const tracking =
      data?.dist?.trackingNumber ??
      data?.trackingNumber ??
      data?.data?.trackingNumber ??
      null;

    if (!tracking) {
      return NextResponse.json({ error: `No tracking number: ${JSON.stringify(data)}` }, { status: 400 });
    }

    await prisma.retailOrder.update({
      where: { id: order.id },
      data: { trackingNumber: tracking, dispatched: true, dispatchedAt: new Date() },
    });

    return NextResponse.json({ ok: true, tracking });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
