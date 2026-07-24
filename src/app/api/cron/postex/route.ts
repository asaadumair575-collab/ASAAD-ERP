import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let key = process.env.POSTEX_API_KEY;
  if (!key) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } });
    key = setting?.value ?? undefined;
  }
  if (!key) return NextResponse.json({ error: "No PostEx API key" });

  const orders = await prisma.ecomOrder.findMany({
    where: { trackingNumber: { not: null }, returned: false },
    select: { id: true, trackingNumber: true, shippingCost: true },
  });

  let returned = 0, delivered = 0;

  for (const order of orders) {
    try {
      const res = await fetch(
        `https://api.postex.pk/services/integration/api/order/v3/get-track-order/${order.trackingNumber}`,
        { method: "GET", headers: { token: key, "Content-Type": "application/json" } as HeadersInit, cache: "no-store" }
      );
      if (!res.ok) continue;
      const json = await res.json();
      const d = (json?.dist ?? json) as Record<string, unknown>;
      const status = String(d?.orderStatus ?? d?.status ?? "");
      const shippingCharges = parseFloat(String(d?.shippingCharges ?? d?.deliveryCharges ?? 0)) || 0;

      if (/return|rto/i.test(status)) {
        await prisma.ecomOrder.update({
          where: { id: order.id },
          data: { returned: true, returnCost: shippingCharges || order.shippingCost },
        });
        returned++;
      } else if (/deliver/i.test(status) && shippingCharges > 0 && order.shippingCost === 0) {
        await prisma.ecomOrder.update({
          where: { id: order.id },
          data: { shippingCost: shippingCharges },
        });
        delivered++;
      }
    } catch { continue; }
  }

  return NextResponse.json({ checked: orders.length, returned, delivered });
}
