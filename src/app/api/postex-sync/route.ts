import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const POSTEX_API = "https://api.postex.pk/services/integration/api/order/v3/get-track-order";

async function fetchPostExStatus(trackingNumber: string): Promise<{
  status: string;
  shippingCharges: number;
  codAmount: number;
  raw?: unknown;
  error?: string;
} | null> {
  let key = process.env.POSTEX_API_KEY;
  if (!key) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } });
    key = setting?.value ?? undefined;
  }
  if (!key) return { status: "", shippingCharges: 0, codAmount: 0, error: "POSTEX_API_KEY not set — go to /ecommerce/settings to add it" };

  try {
    const res = await fetch(`${POSTEX_API}/${trackingNumber}`, {
      method: "GET",
      headers: { token: key, "Content-Type": "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) return { status: "", shippingCharges: 0, codAmount: 0, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };

    let json: unknown;
    try { json = JSON.parse(text); } catch { return { status: "", shippingCharges: 0, codAmount: 0, error: `Not JSON: ${text.slice(0, 200)}` }; }

    const dist = (json as Record<string, unknown>)?.dist ?? json;
    const d = dist as Record<string, unknown>;
    const status: string = String(d?.orderStatus ?? d?.status ?? "");
    const shippingCharges: number = parseFloat(String(d?.shippingCharges ?? d?.deliveryCharges ?? 0)) || 0;
    const codAmount: number = parseFloat(String(d?.invoicePayment ?? d?.codAmount ?? d?.amount ?? 0)) || 0;

    return { status, shippingCharges, codAmount, raw: json };
  } catch (e) {
    return { status: "", shippingCharges: 0, codAmount: 0, error: String(e) };
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
      results.push({ id: order.id, tracking, action: "fetch_failed: null response" });
      continue;
    }
    if (data.error) {
      results.push({ id: order.id, tracking, action: `fetch_failed: ${data.error}` });
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
