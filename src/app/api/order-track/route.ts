import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const POSTEX_TRACK = "https://api.postex.pk/services/integration/api/order/v3/get-track-order";

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
    const res = await fetch(`${POSTEX_TRACK}/${encodeURIComponent(tracking)}`, {
      method: "GET",
      headers: { token: key, "Content-Type": "application/json" } as HeadersInit,
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) return NextResponse.json({ error: `PostEx error: HTTP ${res.status}` }, { status: 502 });

    const json = JSON.parse(text);
    const dist = (json?.dist ?? json) as Record<string, unknown>;

    const orderStatus = String(dist?.orderStatus ?? dist?.status ?? "Unknown");
    const customerName = dist?.customerName ? String(dist.customerName) : undefined;
    const address = dist?.deliveryAddress ? String(dist.deliveryAddress) : undefined;
    const amount = dist?.invoicePayment ?? dist?.amount ?? undefined;
    const shippingCharges = dist?.shippingCharges ?? dist?.deliveryCharges ?? undefined;
    const attempts = dist?.deliveryAttempts !== undefined ? Number(dist.deliveryAttempts) : undefined;
    const lastUpdate = dist?.updatedDate ?? dist?.lastUpdatedAt ?? dist?.statusDate ?? undefined;

    return NextResponse.json({
      trackingNumber: tracking,
      orderStatus,
      customerName,
      address,
      amount,
      shippingCharges,
      attempts,
      lastUpdate: lastUpdate ? String(lastUpdate) : undefined,
    });
  } catch (e) {
    return NextResponse.json({ error: `Failed to reach PostEx: ${String(e)}` }, { status: 502 });
  }
}
