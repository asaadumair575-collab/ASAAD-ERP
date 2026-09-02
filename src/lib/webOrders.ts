import { prisma } from "@/lib/prisma";

// Orders come from the store's own website (tbs-wheat.vercel.app) via
// /api/public/orders, which lands them in EcomOrder directly.
export type WebOrder = {
  id: number;
  totalAmount: number;
  city: string | null;
  draft: boolean;
  date: Date;
  paid: number;
  source: string | null;
};

// Sources the storefront tags as coming from a Meta (Facebook/Instagram) ad —
// see the "source" field docs in /api/public/orders/route.ts.
const META_AD_SOURCES = new Set(["meta_ads", "facebook_ads", "instagram_ads", "fb_ads", "ig_ads"]);

export function isMetaAdOrder(source: string | null): boolean {
  return !!source && META_AD_SOURCES.has(source.toLowerCase());
}

export async function fetchWebOrders(from: string, to: string): Promise<{ orders: WebOrder[]; error?: string }> {
  const dayStart = new Date(`${from}T00:00:00+05:00`);
  const dayEnd = new Date(`${to}T23:59:59+05:00`);

  try {
    const rows = await prisma.ecomOrder.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
      select: {
        id: true, totalAmount: true, city: true, draft: true, date: true, source: true,
        payments: { select: { amount: true } },
      },
    });
    return {
      orders: rows.map((r) => ({
        id: r.id,
        totalAmount: r.totalAmount,
        city: r.city,
        draft: r.draft,
        date: r.date,
        paid: r.payments.reduce((s, p) => s + p.amount, 0),
        source: r.source,
      })),
    };
  } catch {
    return { orders: [], error: "db" };
  }
}
