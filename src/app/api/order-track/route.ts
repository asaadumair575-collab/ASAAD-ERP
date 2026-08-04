import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const BASE = "https://api.postex.pk/services/integration/api/order";

function extractFields(dist: Record<string, unknown>) {
  const orderStatus     = String(dist?.orderStatus ?? dist?.status ?? dist?.orderStatusName ?? "Unknown");
  const customerName    = dist?.customerName ? String(dist.customerName) : undefined;
  const address         = dist?.deliveryAddress ?? dist?.customerAddress
                            ? String(dist?.deliveryAddress ?? dist?.customerAddress) : undefined;
  const amount          = dist?.invoicePayment ?? dist?.orderAmount ?? dist?.amount ?? undefined;
  const shippingCharges = dist?.shippingCharges ?? dist?.deliveryCharges ?? undefined;
  const attempts        = dist?.deliveryAttempts !== undefined ? Number(dist.deliveryAttempts) : undefined;
  const lastUpdate      = dist?.updatedDate ?? dist?.lastUpdatedAt ?? dist?.statusDate ?? undefined;
  const cnNumber        = dist?.trackingNumber ?? dist?.cnNumber ?? undefined;
  return { orderStatus, customerName, address, amount, shippingCharges, attempts,
           lastUpdate: lastUpdate ? String(lastUpdate) : undefined,
           cnNumber: cnNumber ? String(cnNumber) : undefined };
}

async function tryPostex(url: string, key: string, method = "GET", body?: string) {
  try {
    const res = await fetch(url, {
      method,
      headers: { token: key, "Content-Type": "application/json" } as HeadersInit,
      ...(body ? { body } : {}),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = JSON.parse(await res.text());
    const dist = (json?.dist ?? json) as Record<string, unknown>;
    // Make sure we got real data back, not empty
    if (!dist || (!dist.orderStatus && !dist.status && !dist.orderStatusName)) return null;
    return dist;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const input = searchParams.get("tracking")?.trim();
  if (!input) return NextResponse.json({ error: "Order ID required" }, { status: 400 });

  let key = process.env.POSTEX_API_KEY;
  if (!key) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } });
    key = setting?.value ?? undefined;
  }
  if (!key) return NextResponse.json({ error: "PostEx API key not configured" }, { status: 400 });

  // 1. Try to find in our DB (by numeric ID or shopify order ID) to get PostEx CN
  const numericId = parseInt(input, 10);
  const order = await prisma.ecomOrder.findFirst({
    where: isNaN(numericId)
      ? { shopifyOrderId: input }
      : { OR: [{ id: numericId }, { shopifyOrderId: input }] },
    select: { id: true, customerName: true, trackingNumber: true },
  });

  // 2. If found in DB with a CN, query PostEx by CN
  if (order?.trackingNumber) {
    const dist = await tryPostex(`${BASE}/v3/get-track-order/${encodeURIComponent(order.trackingNumber)}`, key);
    if (dist) {
      const fields = extractFields(dist);
      if (!fields.customerName) fields.customerName = order.customerName;
      return NextResponse.json({ orderId: order.id, trackingNumber: order.trackingNumber, ...fields });
    }
  }

  // 3. Try PostEx directly using input as order reference (POST with orderRefNumber)
  const distByRef = await tryPostex(
    `${BASE}/v3/get-track-order`,
    key,
    "POST",
    JSON.stringify({ orderRefNumber: input })
  );
  if (distByRef) {
    const fields = extractFields(distByRef);
    if (order && !fields.customerName) fields.customerName = order.customerName;
    return NextResponse.json({ trackingNumber: input, ...fields });
  }

  // 4. Try as plain order reference GET
  const distByGet = await tryPostex(`${BASE}/v2/get-order-detail/${encodeURIComponent(input)}`, key);
  if (distByGet) {
    const fields = extractFields(distByGet);
    if (order && !fields.customerName) fields.customerName = order.customerName;
    return NextResponse.json({ trackingNumber: input, ...fields });
  }

  // Nothing worked — return helpful error
  if (order && !order.trackingNumber) {
    return NextResponse.json(
      { error: `Order #${order.id} (${order.customerName}) hamare system mein hai lekin PostEx tracking number nahi daala gaya.` },
      { status: 422 }
    );
  }

  return NextResponse.json(
    { error: `Order "${input}" PostEx pe nahi mila. Order ID ya tracking number check karein.` },
    { status: 404 }
  );
}
