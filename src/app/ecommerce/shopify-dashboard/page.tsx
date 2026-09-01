import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DateNav from "./DateNav";

export const maxDuration = 60;

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "";
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN ?? "";
const API = `https://${DOMAIN}/admin/api/2024-07`;

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function pct(a: number, b: number) {
  if (!b) return "0%";
  return `${Math.round((a / b) * 100)}%`;
}

function pctNum(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

type ShopifyOrder = {
  id: number;
  total_price: string;
  financial_status: string;
  fulfillment_status: string | null;
  cancel_reason: string | null;
  shipping_address?: { city?: string };
  billing_address?: { city?: string };
  created_at: string;
};

const FULL_FIELDS = "id,total_price,financial_status,fulfillment_status,cancel_reason,shipping_address,billing_address,created_at";
const SAFE_FIELDS = "id,total_price,financial_status,fulfillment_status,cancel_reason,created_at";

async function fetchPages(baseUrl: string): Promise<{ orders: ShopifyOrder[]; status: number }> {
  const all: ShopifyOrder[] = [];
  let url: string | null = baseUrl;
  while (url) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": TOKEN },
        cache: "no-store",
      });
    } catch {
      return { orders: all, status: 0 };
    }
    if (!res.ok) return { orders: all, status: res.status };
    const data: { orders?: ShopifyOrder[] } = await res.json();
    all.push(...(data.orders ?? []));
    const link: string = res.headers.get("link") ?? "";
    const next: string | null = link.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    url = next;
  }
  return { orders: all, status: 200 };
}

async function fetchOrders(
  from: string,
  to: string
): Promise<{ orders: ShopifyOrder[]; error?: string; limitedFields?: boolean }> {
  if (!DOMAIN || !TOKEN) return { orders: [], error: "config" };

  const minDate = new Date(`${from}T00:00:00+05:00`).toISOString();
  const maxDate = new Date(`${to}T23:59:59+05:00`).toISOString();
  const query = `status=any&created_at_min=${encodeURIComponent(minDate)}&created_at_max=${encodeURIComponent(maxDate)}&limit=250`;

  const full = await fetchPages(`${API}/orders.json?${query}&fields=${FULL_FIELDS}`);
  if (full.status === 200) return { orders: full.orders };

  // 403 usually means "protected customer data" (addresses) is not approved for
  // this app — retry without address fields so the stats still work.
  if (full.status === 403) {
    const safe = await fetchPages(`${API}/orders.json?${query}&fields=${SAFE_FIELDS}`);
    if (safe.status === 200) return { orders: safe.orders, limitedFields: true };
    return { orders: [], error: `${safe.status || "network"}` };
  }

  return { orders: [], error: `${full.status || "network"}` };
}

// ── PostEx courier stats ─────────────────────────────────
type CourierStats = {
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

async function fetchPostexStats(from: string, to: string): Promise<CourierStats> {
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
    prisma.retailOrder.findMany({
      where: { trackingNumber: { not: null }, date: { gte: dayStart, lte: dayEnd } },
      select: { trackingNumber: true },
      take: 200,
    }),
    prisma.ecomOrder.findMany({
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

export default async function ShopifyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { from: fromParam, to: toParam } = await searchParams;

  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const from = fromParam ?? todayPK;
  const to = toParam ?? todayPK;

  // --- Date label ---
  const dateLabel =
    from === to
      ? new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : `${new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short" })} — ${new Date(`${to}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`;

  // Kick off the slow fetch once; both the hero and the stats section await
  // it inside their own Suspense boundaries so the page shell (header + date
  // buttons) renders immediately and the data streams in behind skeletons.
  const ordersPromise = fetchOrders(from, to);
  const rangeKey = `${from}_${to}`;

  return (
    <div className="max-w-5xl space-y-6 pb-8">
      {/* Header — brand hero */}
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap shadow-sm relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <div>
          <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Shopify · The Boundary Shop</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sales Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Total Revenue</p>
          {/* keyed so the fallback shows on every date change instead of the old number sticking around */}
          <Suspense
            key={`hero-${rangeKey}`}
            fallback={
              <>
                <div className="h-8 w-32 bg-white/10 rounded-lg animate-pulse ml-auto mt-1" />
                <div className="h-3 w-16 bg-white/10 rounded ml-auto mt-2 animate-pulse" />
              </>
            }
          >
            <HeroRevenue ordersPromise={ordersPromise} />
          </Suspense>
        </div>
      </div>

      {/* Date picker — always interactive, never blocked by data */}
      <DateNav from={from} to={to} today={todayPK} />

      <Suspense key={`shopify-${rangeKey}`} fallback={<StatsSkeleton />}>
        <ShopifySection ordersPromise={ordersPromise} from={from} to={to} />
      </Suspense>

      <Suspense key={`courier-${rangeKey}`} fallback={<CourierSkeleton dateLabel={dateLabel} />}>
        <CourierSection from={from} to={to} dateLabel={dateLabel} />
      </Suspense>
    </div>
  );
}

async function HeroRevenue({ ordersPromise }: { ordersPromise: ReturnType<typeof fetchOrders> }) {
  const { orders } = await ordersPromise;
  const revenue = orders.reduce((s, o) => s + parseFloat(o.total_price || "0"), 0);
  return (
    <>
      <p className="text-3xl font-bold tabular-nums text-[#BFD732]">Rs {fmt(revenue)}</p>
      <p className="text-xs text-gray-400 mt-0.5">{orders.length} orders</p>
    </>
  );
}

async function ShopifySection({
  ordersPromise,
  from,
  to,
}: {
  ordersPromise: ReturnType<typeof fetchOrders>;
  from: string;
  to: string;
}) {
  const { orders, error, limitedFields } = await ordersPromise;

  // --- Metrics ---
  const total = orders.length;
  const revenue = orders.reduce((s, o) => s + parseFloat(o.total_price || "0"), 0);
  const avgOrder = total ? revenue / total : 0;

  const paid = orders.filter((o) => o.financial_status === "paid").length;
  const conversionRate = pctNum(paid, total);

  // --- City breakdown ---
  const cityMap: Record<string, { orders: number; revenue: number }> = {};
  for (const o of orders) {
    const city = (o.shipping_address?.city ?? o.billing_address?.city ?? "Unknown").trim();
    if (!cityMap[city]) cityMap[city] = { orders: 0, revenue: 0 };
    cityMap[city].orders += 1;
    cityMap[city].revenue += parseFloat(o.total_price || "0");
  }
  const cities = Object.entries(cityMap)
    .sort((a, b) => b[1].orders - a[1].orders)
    .slice(0, 10);

  const topCityOrders = cities[0]?.[1].orders ?? 0;

  return (
    <>
      {error === "config" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
          <strong>Config missing:</strong> SHOPIFY_ADMIN_TOKEN or SHOPIFY_STORE_DOMAIN is not set in Vercel.
        </div>
      )}
      {error === "403" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700 space-y-1">
          <p><strong>403 — Access denied.</strong> The Shopify app does not have permission to read orders.</p>
          <p>Shopify Admin → Settings → Apps and sales channels → Develop apps → your app → <strong>Configure Admin API scopes</strong> → enable <code>read_orders</code> → Save → <strong>Install/Reinstall</strong> the app → copy the new token into <code>SHOPIFY_ADMIN_TOKEN</code> on Vercel → Redeploy.</p>
        </div>
      )}
      {error && error !== "config" && error !== "403" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
          <strong>API Error {error}:</strong> Could not fetch data from Shopify. Check the token and store domain.
        </div>
      )}
      {limitedFields && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
          <strong>Note:</strong> Customer address data is not permitted, so the city-wise breakdown is hidden. Request <strong>Protected customer data access</strong> in your Shopify app settings to enable it.
        </div>
      )}

      {total > 0 ? (
        <>
          {/* Row 1 — key numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <BigStat label="Total Orders" value={String(total)} />
            <BigStat label="Paid Orders" value={String(paid)} sub={pct(paid, total)} />
            <BigStat label="Avg Order Value" value={`Rs ${fmt(avgOrder)}`} />
            <BigStat label="Conversion" value={`${conversionRate}%`} sub="paid / total" />
          </div>

          {/* Revenue strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RevenueCard label="Gross Revenue" value={`Rs ${fmt(revenue)}`} />
            <RevenueCard label="Paid Revenue" value={`Rs ${fmt(orders.filter(o => o.financial_status === "paid").reduce((s, o) => s + parseFloat(o.total_price || "0"), 0))}`} sub="from paid orders" />
            <RevenueCard label="Orders per day" value={from === to ? String(total) : String(Math.round(total / (Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1))))} sub={from === to ? "today" : "avg daily"} />
          </div>

          {/* City breakdown */}
          {cities.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">City-wise Breakdown</p>
                <span className="text-xs text-gray-400">{cities.length} cities</span>
              </div>
              <div className="divide-y divide-gray-50">
                {cities.map(([city, stats], i) => (
                  <div key={city} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="text-xs font-bold text-gray-300 w-5 tabular-nums">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-800 truncate">{city}</span>
                        <span className="text-sm font-bold text-gray-900 tabular-nums ml-3">Rs {fmt(stats.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#16202E] to-[#BFD732] rounded-full transition-all"
                            style={{ width: `${Math.round((stats.orders / topCityOrders) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
                          {stats.orders} orders · {pct(stats.orders, total)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
                <span className="text-xs font-semibold text-gray-500">Total</span>
                <span className="text-xs font-bold text-gray-900 tabular-nums">{total} orders · Rs {fmt(revenue)}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        !error && (
          <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center">
            <p className="text-3xl mb-3">📦</p>
            <p className="text-sm font-medium text-gray-500">No orders in this date range</p>
            <p className="text-xs text-gray-400 mt-1">Try a different date range</p>
          </div>
        )
      )}
    </>
  );
}

async function CourierSection({ from, to, dateLabel }: { from: string; to: string; dateLabel: string }) {
  const courier = await fetchPostexStats(from, to);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-[#16202E]">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-[#BFD732]">
              <path d="M2.5 6.5 10 2.5l7.5 4M2.5 6.5v7l7.5 4 7.5-4v-7M2.5 6.5 10 10.5l7.5-4M10 10.5V17.5"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-semibold text-white">Courier — PostEx</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-[#BFD732]">{dateLabel}</p>
            {!courier.error && <p className="text-[11px] text-gray-400 mt-0.5">{courier.total} parcels</p>}
          </div>
        </div>

        {courier.error === "config" && (
          <div className="px-5 py-6 text-sm text-amber-700 bg-amber-50">
            <strong>Config missing:</strong> POSTEX_API_TOKEN / POSTEX_RETAIL_API_TOKEN is not set in Vercel.
          </div>
        )}
        {courier.error?.startsWith("api") && (
          <div className="px-5 py-6 text-sm text-red-600 bg-red-50">
            Could not fetch parcel data from PostEx (HTTP {courier.error.replace("api:", "")}). Check the API tokens.
          </div>
        )}

        {!courier.error && (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CourierCard label="Total Parcels" value={courier.total} highlight />
              <CourierCard label="Delivered" value={courier.delivered} sub={pct(courier.delivered, courier.total)} dot="bg-[#BFD732]" />
              <CourierCard label="Out for Delivery" value={courier.outForDelivery} sub={pct(courier.outForDelivery, courier.total)} dot="bg-blue-400" />
              <CourierCard label="On the Way" value={courier.onTheWay} sub={pct(courier.onTheWay, courier.total)} dot="bg-amber-400" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CourierCard label="Booked / Pending" value={courier.booked} sub={pct(courier.booked, courier.total)} dot="bg-gray-400" />
              <CourierCard label="Attempted" value={courier.attempted} sub={pct(courier.attempted, courier.total)} dot="bg-orange-400" />
              <CourierCard label="Returned" value={courier.returned} sub={pct(courier.returned, courier.total)} dot="bg-red-400" />
              <CourierCard label="Cancelled" value={courier.cancelled + courier.other} sub={pct(courier.cancelled + courier.other, courier.total)} dot="bg-gray-300" />
            </div>

            {courier.total > 0 && (
              <div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
                  <div className="bg-[#BFD732]" style={{ width: pct(courier.delivered, courier.total) }} />
                  <div className="bg-blue-400" style={{ width: pct(courier.outForDelivery, courier.total) }} />
                  <div className="bg-amber-400" style={{ width: pct(courier.onTheWay, courier.total) }} />
                  <div className="bg-red-400" style={{ width: pct(courier.returned, courier.total) }} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                  <LegendDot color="bg-[#BFD732]" label="Delivered" />
                  <LegendDot color="bg-blue-400" label="Out for Delivery" />
                  <LegendDot color="bg-amber-400" label="On the Way" />
                  <LegendDot color="bg-red-400" label="Returned" />
                </div>
              </div>
            )}

            {courier.total === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No parcels booked in this date range</p>
            )}
          </div>
        )}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-2xl" />
    </div>
  );
}

function CourierSkeleton({ dateLabel }: { dateLabel: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-[#16202E]">
        <p className="text-sm font-semibold text-white">Courier — PostEx</p>
        <div className="text-right">
          <p className="text-xs font-semibold text-[#BFD732]">{dateLabel}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">checking parcels…</p>
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function BigStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#BFD732]" />
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-bold tabular-nums leading-none text-[#16202E]">{value}</p>
      {sub && <p className="text-xs mt-1.5 font-semibold text-gray-400">{sub}</p>}
    </div>
  );
}


function CourierCard({ label, value, sub, dot, highlight }: { label: string; value: number; sub?: string; dot?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? "bg-[#16202E] border-[#16202E]" : "bg-gray-50/60 border-gray-100"}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${highlight ? "text-gray-400" : "text-gray-400"}`}>{label}</p>
      </div>
      <p className={`text-2xl font-bold tabular-nums leading-none ${highlight ? "text-[#BFD732]" : "text-[#16202E]"}`}>{value}</p>
      {sub && <p className="text-xs mt-1 font-medium text-gray-400">{sub}</p>}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function RevenueCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-400 mb-2">{label}</p>
      <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
