import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const BASE = "https://api.postex.pk/services/integration/api/order";

function extractFields(raw: Record<string, unknown>) {
  const dist = (raw?.dist ?? raw) as Record<string, unknown>;
  const orderStatus     = String(dist?.orderStatus ?? dist?.status ?? dist?.orderStatusName ?? "");
  if (!orderStatus) return null; // empty response — not a real result
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

async function tryFetch(url: string, key: string, method = "GET", body?: string) {
  try {
    const res = await fetch(url, {
      method,
      headers: { token: key, "Content-Type": "application/json" } as HeadersInit,
      ...(body ? { body } : {}),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = JSON.parse(await res.text());
    return extractFields(json);
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

  // Try every known PostEx endpoint — whichever returns data wins
  const attempts = [
    () => tryFetch(`${BASE}/v3/get-track-order/${encodeURIComponent(input)}`, key!),
    () => tryFetch(`${BASE}/v2/get-track-order/${encodeURIComponent(input)}`, key!),
    () => tryFetch(`${BASE}/v1/get-track-order/${encodeURIComponent(input)}`, key!),
    () => tryFetch(`${BASE}/v3/get-track-order`, key!, "POST", JSON.stringify({ orderRefNumber: input })),
    () => tryFetch(`${BASE}/v3/get-track-order`, key!, "POST", JSON.stringify({ orderRef: input })),
    () => tryFetch(`${BASE}/v3/get-track-order`, key!, "POST", JSON.stringify({ trackingNumber: input })),
    () => tryFetch(`${BASE}/v2/get-order-detail/${encodeURIComponent(input)}`, key!),
    () => tryFetch(`${BASE}/v3/get-order/${encodeURIComponent(input)}`, key!),
  ];

  // Also check DB for a linked PostEx CN and try that too
  const numericId = parseInt(input, 10);
  const dbOrder = await prisma.ecomOrder.findFirst({
    where: isNaN(numericId)
      ? { shopifyOrderId: input }
      : { OR: [{ id: numericId }, { shopifyOrderId: input }] },
    select: { id: true, customerName: true, trackingNumber: true },
  });

  if (dbOrder?.trackingNumber && dbOrder.trackingNumber !== input) {
    const cn = dbOrder.trackingNumber;
    attempts.unshift(
      () => tryFetch(`${BASE}/v3/get-track-order/${encodeURIComponent(cn)}`, key!),
    );
  }

  for (const attempt of attempts) {
    const result = await attempt();
    if (result) {
      const customerName = result.customerName ?? dbOrder?.customerName;
      return NextResponse.json({
        trackingNumber: input,
        ...(dbOrder ? { orderId: dbOrder.id } : {}),
        ...result,
        ...(customerName ? { customerName } : {}),
      });
    }
  }

  return NextResponse.json(
    { error: `Order "${input}" PostEx pe nahi mila. Order ID ya tracking number dobara check karein.` },
    { status: 404 }
  );
}
