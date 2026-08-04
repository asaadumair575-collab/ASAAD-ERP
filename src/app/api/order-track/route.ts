import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const POSTEX_BY_CN = "https://api.postex.pk/services/integration/api/order/v3/get-track-order";

function extractFields(dist: Record<string, unknown>) {
  const orderStatus     = String(dist?.orderStatus ?? dist?.status ?? dist?.orderStatusName ?? "Unknown");
  const customerName    = dist?.customerName    ? String(dist.customerName)    : undefined;
  const address         = dist?.deliveryAddress ?? dist?.customerAddress
                            ? String(dist?.deliveryAddress ?? dist?.customerAddress) : undefined;
  const amount          = dist?.invoicePayment  ?? dist?.orderAmount ?? dist?.amount ?? undefined;
  const shippingCharges = dist?.shippingCharges ?? dist?.deliveryCharges ?? undefined;
  const attempts        = dist?.deliveryAttempts !== undefined ? Number(dist.deliveryAttempts) : undefined;
  const lastUpdate      = dist?.updatedDate ?? dist?.lastUpdatedAt ?? dist?.statusDate ?? undefined;
  const cnNumber        = dist?.trackingNumber  ?? dist?.cnNumber ?? undefined;
  return { orderStatus, customerName, address, amount, shippingCharges, attempts,
           lastUpdate: lastUpdate ? String(lastUpdate) : undefined,
           cnNumber: cnNumber ? String(cnNumber) : undefined };
}

export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("tracking")?.trim();
  if (!orderId) return NextResponse.json({ error: "Order ID required" }, { status: 400 });

  let key = process.env.POSTEX_API_KEY;
  if (!key) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } });
    key = setting?.value ?? undefined;
  }
  if (!key) return NextResponse.json({ error: "PostEx API key not configured" }, { status: 400 });

  // Look up in our DB — by numeric ID or shopify order ID
  const numericId = parseInt(orderId, 10);
  const order = await prisma.ecomOrder.findFirst({
    where: isNaN(numericId)
      ? { shopifyOrderId: orderId }
      : { OR: [{ id: numericId }, { shopifyOrderId: orderId }] },
    select: { id: true, customerName: true, trackingNumber: true, shopifyOrderId: true },
  });

  if (!order) {
    return NextResponse.json(
      { error: `Order "${orderId}" hamare system mein nahi mila.` },
      { status: 404 }
    );
  }

  if (!order.trackingNumber) {
    return NextResponse.json(
      { error: `Order #${order.id} (${order.customerName}) ka PostEx tracking number set nahi — pehle tracking number daalen.` },
      { status: 422 }
    );
  }

  // Fetch live status from PostEx by CN
  try {
    const res = await fetch(`${POSTEX_BY_CN}/${encodeURIComponent(order.trackingNumber)}`, {
      method: "GET",
      headers: { token: key, "Content-Type": "application/json" } as HeadersInit,
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `PostEx error: HTTP ${res.status} — tracking number "${order.trackingNumber}" check karein.` },
        { status: 502 }
      );
    }

    const json = JSON.parse(text);
    const dist = (json?.dist ?? json) as Record<string, unknown>;

    const fields = extractFields(dist);
    if (!fields.customerName) fields.customerName = order.customerName;
    return NextResponse.json({
      orderId: order.id,
      trackingNumber: order.trackingNumber,
      ...fields,
    });
  } catch (e) {
    return NextResponse.json({ error: `PostEx reach nahi ho raha: ${String(e)}` }, { status: 502 });
  }
}
