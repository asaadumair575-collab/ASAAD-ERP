import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const POSTEX_BASE = "https://api.postex.pk/services/integration/api";
const POSTEX_TOKEN = process.env.POSTEX_API_TOKEN ?? "";

async function createPostexBooking(order: {
  id: number;
  customerName: string;
  phone: string | null;
  city: string | null;
  address: string | null;
  totalAmount: number;
  notes: string | null;
  payments: { amount: number }[];
  items: { description: string; quantity: number }[];
}) {
  const orderRef = order.notes?.replace("Shopify Order ", "") ?? `E-${order.id}`;
  const advancePaid = order.payments.reduce((s, p) => s + p.amount, 0);
  const codAmount = Math.max(0, order.totalAmount - advancePaid);
  const deliveryAddress = order.address ?? order.city ?? "";
  const orderDetail = order.items.map((i) => `${i.description} x${i.quantity}`).join(", ") || orderRef;

  const res = await fetch(`${POSTEX_BASE}/order/v3/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: POSTEX_TOKEN,
    },
    body: JSON.stringify({
      orderType: "Normal",
      pickupAddressCode: "001",
      orderRefNumber: orderRef,
      cityName: order.city ?? "Karachi",
      customerName: order.customerName,
      customerPhone: order.phone ?? "",
      deliveryAddress,
      invoicePayment: codAmount,
      invoiceNumber: orderRef,
      items: order.items.length || 1,
      orderDetail,
      transactionNotes: orderRef,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Postex error ${res.status}: ${text}`);
  }

  const data = await res.json();
  console.log("[Postex response]", JSON.stringify(data));

  // Postex sometimes returns 200 with statusCode=false on error
  if (data?.statusCode === false || data?.status === false) {
    throw new Error(data?.message ?? `Postex rejected: ${JSON.stringify(data)}`);
  }

  // Postex returns trackingNumber in data.dist.trackingNumber or data.trackingNumber
  const tracking =
    data?.dist?.trackingNumber ??
    data?.trackingNumber ??
    data?.data?.trackingNumber ??
    null;

  if (!tracking) throw new Error(`No tracking number in response: ${JSON.stringify(data)}`);
  return tracking as string;
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json(); // array of order ids
  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: "No orders selected" }, { status: 400 });

  const orders = await prisma.ecomOrder.findMany({
    where: { id: { in: ids.map(Number) }, draft: false },
    select: {
      id: true, customerName: true, phone: true, city: true, address: true, totalAmount: true, notes: true, trackingNumber: true,
      payments: { select: { amount: true } },
      items: { select: { description: true, quantity: true } },
    },
  });

  const results: { id: number; tracking?: string; error?: string }[] = [];

  for (const order of orders) {
    if (order.trackingNumber) {
      results.push({ id: order.id, tracking: order.trackingNumber }); // already dispatched
      continue;
    }
    try {
      const tracking = await createPostexBooking(order);
      await prisma.ecomOrder.update({
        where: { id: order.id },
        data: { trackingNumber: tracking, dispatchedAt: new Date() },
      });
      results.push({ id: order.id, tracking });
    } catch (e: unknown) {
      results.push({ id: order.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
