import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const POSTEX_API = "https://api.postex.pk/services/integration/api/order/v3/get-track-order";

async function fetchStatus(trackingNumber: string, key: string) {
  try {
    const res = await fetch(`${POSTEX_API}/${trackingNumber}`, {
      method: "GET",
      headers: { token: key, "Content-Type": "application/json" } as HeadersInit,
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const json = JSON.parse(text);
    const dist = json?.dist ?? json;
    const d = dist as Record<string, unknown>;
    const status = String(d?.orderStatus ?? d?.status ?? "");
    const shippingCharges = parseFloat(String(d?.shippingCharges ?? d?.deliveryCharges ?? 0)) || 0;
    const isReturn = /return|rto/i.test(status);
    const isDelivered = /deliver/i.test(status);
    return { status, shippingCharges, isReturn, isDelivered };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const preview = searchParams.get("preview") === "1";

  let key = process.env.POSTEX_API_KEY;
  if (!key) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } });
    key = setting?.value ?? undefined;
  }
  if (!key) return NextResponse.json({ error: "PostEx API key not set — go to Ecommerce → Settings" }, { status: 400 });

  const orders = await prisma.ecomOrder.findMany({
    where: { trackingNumber: { not: null }, returned: false },
    select: { id: true, customerName: true, trackingNumber: true, totalAmount: true, shippingCost: true },
  });

  const results = [];

  for (const order of orders) {
    const tracking = order.trackingNumber!;
    const data = await fetchStatus(tracking, key);

    if ("error" in data) {
      results.push({ orderId: order.id, customer: order.customerName, tracking, amount: order.totalAmount, status: "", shippingCharges: 0, isReturn: false, error: data.error });
      continue;
    }

    if (!preview) {
      if (data.isReturn) {
        await prisma.ecomOrder.update({
          where: { id: order.id },
          data: { returned: true, returnCost: data.shippingCharges || order.shippingCost },
        });
      } else if (data.isDelivered && data.shippingCharges > 0 && order.shippingCost === 0) {
        await prisma.ecomOrder.update({
          where: { id: order.id },
          data: { shippingCost: data.shippingCharges },
        });
      }
    }

    results.push({ orderId: order.id, customer: order.customerName, tracking, amount: order.totalAmount, status: data.status, shippingCharges: data.shippingCharges, isReturn: data.isReturn });
  }

  return NextResponse.json({ results });
}
