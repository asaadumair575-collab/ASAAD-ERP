import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const POSTEX_BY_REF = "https://api.postex.pk/services/integration/api/order/v2/get-order-detail";

function extractFields(dist: Record<string, unknown>) {
  const orderStatus  = String(dist?.orderStatus ?? dist?.status ?? dist?.orderStatusName ?? "Unknown");
  const customerName = dist?.customerName   ? String(dist.customerName)   : undefined;
  const address      = dist?.deliveryAddress ?? dist?.customerAddress
                         ? String(dist?.deliveryAddress ?? dist?.customerAddress) : undefined;
  const amount       = dist?.invoicePayment ?? dist?.orderAmount ?? dist?.amount ?? undefined;
  const shippingCharges = dist?.shippingCharges ?? dist?.deliveryCharges ?? undefined;
  const attempts     = dist?.deliveryAttempts !== undefined ? Number(dist.deliveryAttempts) : undefined;
  const lastUpdate   = dist?.updatedDate ?? dist?.lastUpdatedAt ?? dist?.statusDate ?? undefined;
  const cnNumber     = dist?.trackingNumber ?? dist?.cnNumber ?? undefined;
  return { orderStatus, customerName, address, amount, shippingCharges, attempts,
           lastUpdate: lastUpdate ? String(lastUpdate) : undefined,
           cnNumber: cnNumber ? String(cnNumber) : undefined };
}

async function postexGet(url: string, key: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: { token: key, "Content-Type": "application/json" } as HeadersInit,
    cache: "no-store",
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tracking = searchParams.get("tracking")?.trim();
  if (!tracking) return NextResponse.json({ error: "Tracking number required" }, { status: 400 });

  let key = process.env.POSTEX_API_KEY;
  if (!key) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } });
    key = setting?.value ?? undefined;
  }
  if (!key) return NextResponse.json({ error: "PostEx API key not configured" }, { status: 400 });

  try {
    const refRes = await postexGet(`${POSTEX_BY_REF}/${encodeURIComponent(tracking)}`, key);
    if (!refRes.ok) {
      return NextResponse.json(
        { error: `Order ID "${tracking}" PostEx pe nahi mila. Order ID check karein.` },
        { status: 404 }
      );
    }
    const json = JSON.parse(refRes.text);
    const dist = (json?.dist ?? json) as Record<string, unknown>;
    return NextResponse.json({ trackingNumber: tracking, ...extractFields(dist) });
  } catch (e) {
    return NextResponse.json({ error: `Failed to reach PostEx: ${String(e)}` }, { status: 502 });
  }
}
