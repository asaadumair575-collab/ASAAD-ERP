import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const POSTEX_API = "https://api.postex.pk/services/integration/api/order/v3/get-track-order";

async function fetchPostExStatus(trackingNumber: string): Promise<{
  status: string;
  shippingCharges: number;
  codAmount: number;
} | null> {
  const key = process.env.POSTEX_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`${POSTEX_API}/${trackingNumber}`, {
      method: "GET",
      headers: { token: key, "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();

    // PostEx response: json.dist.orderStatus / shippingCharges / invoicePayment
    const dist = json?.dist ?? json;
    const status: string = dist?.orderStatus ?? dist?.status ?? "";
    const shippingCharges: number = parseFloat(dist?.shippingCharges ?? dist?.deliveryCharges ?? 0) || 0;
    const codAmount: number = parseFloat(dist?.invoicePayment ?? dist?.codAmount ?? dist?.amount ?? 0) || 0;

    return { status, shippingCharges, codAmount };
  } catch {
    return null;
  }
}

export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.ecomOrder.findMany({
    where: {
      trackingNumber: { not: null },
      returned: false,
    },
  });

  const results: { id: number; tracking: string; action: string }[] = [];

  for (const order of orders) {
    const tracking = order.trackingNumber!;
    const data = await fetchPostExStatus(tracking);
    if (!data) {
      results.push({ id: order.id, tracking, action: "fetch_failed" });
      continue;
    }

    const statusLower = data.status.toLowerCase();
    const isReturn = statusLower.includes("return") || statusLower.includes("rto");
    const isDelivered = statusLower.includes("deliver");

    if (isReturn) {
      await prisma.ecomOrder.update({
        where: { id: order.id },
        data: {
          returned: true,
          returnCost: data.shippingCharges || order.returnCost,
        },
      });
      results.push({ id: order.id, tracking, action: `marked_returned (${data.status})` });
    } else if (isDelivered && data.shippingCharges > 0 && order.shippingCost === 0) {
      await prisma.ecomOrder.update({
        where: { id: order.id },
        data: { shippingCost: data.shippingCharges },
      });
      results.push({ id: order.id, tracking, action: `updated_shipping Rs ${data.shippingCharges}` });
    } else {
      results.push({ id: order.id, tracking, action: `no_change (${data.status})` });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
