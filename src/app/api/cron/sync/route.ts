import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { refreshTracking } from "@/lib/shipping";
import { syncStore } from "@/lib/shopify";

export const maxDuration = 300;

// Daily safety net: sync every active store's Shopify orders and courier tracking.
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const tenants = await db.tenant.findMany({
    where: { status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { id: true, shopify: { select: { id: true } } },
  });
  let synced = 0;
  for (const t of tenants) {
    if (t.shopify) await syncStore(t.id).then(() => synced++).catch(() => null);
    await refreshTracking(t.id, { staleMinutes: 60, limit: 200 }).catch(() => null);
  }
  return NextResponse.json({ tenants: tenants.length, synced });
}
