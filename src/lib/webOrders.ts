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
// see the "source" field docs in /api/public/orders/route.ts. Matched
// loosely (not an exact-string set) because the storefront's actual value
// has drifted from the documented "meta_ads"/"facebook_ads" convention in
// practice — e.g. plain "facebook", "fb", "instagram", "ig", "paid_social" —
// and an exact-match check was silently zeroing out ad-attributed revenue
// for every order that didn't hit one of exactly 5 strings.
const META_AD_KEYWORDS = ["meta", "facebook", "fb_", "fb-", "instagram", "ig_", "ig-", "paid_social", "paidsocial"];

export function isMetaAdOrder(source: string | null): boolean {
  if (!source) return false;
  const s = source.toLowerCase();
  if (s === "fb" || s === "ig") return true;
  return META_AD_KEYWORDS.some((kw) => s.includes(kw));
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
