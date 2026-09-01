import { prisma } from "@/lib/prisma";

// ── PostEx courier stats (shared by the Shopify and Retail dashboards) ──
export type CourierStats = {
  total: number;
  delivered: number;
  outForDelivery: number;
  onTheWay: number;
  returned: number;
  booked: number;
  attempted: number;
  cancelled: number;
  other: number;
  error?: string;
};

function classifyStatus(status: string): keyof Omit<CourierStats, "total" | "error"> {
  const s = status.toLowerCase();
  if (/deliver/.test(s) && !/out for/.test(s)) return "delivered";
  if (/out for delivery/.test(s)) return "outForDelivery";
  if (/return|rto/.test(s)) return "returned";
  if (/attempt/.test(s)) return "attempted";
  if (/cancel/.test(s)) return "cancelled";
  if (/transit|route|way|departed|arrived|picked|warehouse|hub/.test(s)) return "onTheWay";
  if (/book|unbook|pending/.test(s)) return "booked";
  return "other";
}

const TRACK_BASE = "https://api.postex.pk/services/integration/api/order";
const TRACK_VERSIONS = ["v3", "v2", "v1"];

async function trackOne(cn: string, tokens: string[], codes: Map<string, number>): Promise<string | null> {
  const clean = cn.trim();
  for (const token of tokens) {
    for (const v of TRACK_VERSIONS) {
    try {
      const res = await fetch(`${TRACK_BASE}/${v}/get-track-order/${encodeURIComponent(clean)}`, {
        headers: { token, "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        codes.set(String(res.status), (codes.get(String(res.status)) ?? 0) + 1);
        continue;
      }
      const json = await res.json();
      const d = (json?.dist ?? json) as Record<string, unknown>;
      const status = String(d?.transactionStatus ?? d?.orderStatus ?? d?.status ?? "");
      if (status) return status;
      codes.set("empty", (codes.get("empty") ?? 0) + 1);
    } catch (e) {
      const label = e instanceof Error && e.name === "TimeoutError" ? "timeout" : "network";
      codes.set(label, (codes.get(label) ?? 0) + 1);
    }
    }
  }
  return null;
}

export async function fetchPostexStats(
  from: string,
  to: string,
  source: "all" | "retail" | "ecom" = "all"
): Promise<CourierStats> {
  const stats: CourierStats = {
    total: 0, delivered: 0, outForDelivery: 0, onTheWay: 0,
    returned: 0, booked: 0, attempted: 0, cancelled: 0, other: 0,
  };

  const retailToken = process.env.POSTEX_RETAIL_API_TOKEN ?? "";
  const ecomToken = process.env.POSTEX_API_TOKEN ?? "";
  let ecomKey = process.env.POSTEX_API_KEY ?? "";
  if (!ecomKey) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } }).catch(() => null);
    ecomKey = setting?.value ?? "";
  }
  const retailTokens = [retailToken, ecomToken, ecomKey].filter(Boolean);
  const ecomTokens = [ecomKey, ecomToken, retailToken].filter(Boolean);
  if (retailTokens.length === 0) return { ...stats, error: "config" };

  const dayStart = new Date(`${from}T00:00:00+05:00`);
  const dayEnd = new Date(`${to}T23:59:59+05:00`);

  // Parcels booked in the selected range, from our own DB (tracking numbers)
  const [retailOrders, ecomOrders] = await Promise.all([
    source === "ecom"
      ? Promise.resolve([])
      : prisma.retailOrder.findMany({
          where: { trackingNumber: { not: null }, date: { gte: dayStart, lte: dayEnd } },
          select: { trackingNumber: true },
          take: 200,
        }),
    source === "retail"
      ? Promise.resolve([])
      : prisma.ecomOrder.findMany({
          where: { trackingNumber: { not: null }, date: { gte: dayStart, lte: dayEnd } },
          select: { trackingNumber: true },
          take: 200,
        }),
  ]).catch(() => [[], []] as [{ trackingNumber: string | null }[], { trackingNumber: string | null }[]]);

  const jobs: { cn: string; tokens: string[] }[] = [
    ...retailOrders.filter((o) => o.trackingNumber).map((o) => ({ cn: o.trackingNumber!, tokens: retailTokens })),
    ...ecomOrders.filter((o) => o.trackingNumber).map((o) => ({ cn: o.trackingNumber!, tokens: ecomTokens })),
  ];

  if (jobs.length === 0) return stats;

  // Fetch in parallel batches; stop before the serverless time budget runs out
  const deadline = Date.now() + 45_000;
  const codes = new Map<string, number>();
  let anyOk = false;
  let skipped = 0;
  for (let i = 0; i < jobs.length; i += 15) {
    if (Date.now() > deadline) {
      skipped = jobs.length - i;
      break;
    }
    const batch = jobs.slice(i, i + 15);
    const statuses = await Promise.all(batch.map((j) => trackOne(j.cn, j.tokens, codes)));
    for (const status of statuses) {
      if (status === null) continue;
      anyOk = true;
      stats.total += 1;
      stats[classifyStatus(status)] += 1;
    }
  }

  if (!anyOk && jobs.length > 0 && skipped < jobs.length) {
    const detail = [...codes.entries()].map(([k, v]) => `${k}×${v}`).join(", ") || "no responses";
    const sample = jobs.slice(0, 2).map((j) => j.cn).join(", ");
    return { ...stats, error: `api:${detail} — sample CN: ${sample}` };
  }
  return stats;
}
