import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DateNav from "./DateNav";
import { fetchMetaStats } from "@/lib/metaAds";
import { fetchWebOrders, isMetaAdOrder, type WebOrder } from "@/lib/webOrders";

export const maxDuration = 60;

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

const LIST_API = "https://api.postex.pk/services/integration/api/order/v1/get-all-order";

async function fetchAccountOrders(
  token: string,
  from: string,
  to: string
): Promise<{ statuses: string[]; ok: boolean; code: string }> {
  // Correct params per PostEx API: orderStatusId (Integer), startDate, endDate; auth via `token` header
  const tryUrls = [
    `${LIST_API}?orderStatusId=0&startDate=${from}&endDate=${to}`,
    // some accounts reject 0 = all; fall back to per-status merge below
  ];
  const headers = { token, "Content-Type": "application/json" };

  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const json = await res.json();
        const list: Record<string, unknown>[] = Array.isArray(json?.dist) ? json.dist : [];
        return { statuses: list.map((o) => String(o.transactionStatus ?? o.orderStatus ?? o.status ?? "")), ok: true, code: "200" };
      }
      if (res.status !== 400) return { statuses: [], ok: false, code: String(res.status) };
    } catch {
      return { statuses: [], ok: false, code: "network" };
    }
  }

  // orderStatusId=0 rejected — merge per-status queries (PostEx status ids)
  const all: string[] = [];
  let anyOk = false;
  let lastCode = "400";
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    try {
      const res = await fetch(`${LIST_API}?orderStatusId=${id}&startDate=${from}&endDate=${to}`, {
        headers, cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) { lastCode = String(res.status); continue; }
      anyOk = true;
      const json = await res.json();
      const list: Record<string, unknown>[] = Array.isArray(json?.dist) ? json.dist : [];
      all.push(...list.map((o) => String(o.transactionStatus ?? o.orderStatus ?? o.status ?? "")));
    } catch {
      lastCode = "network";
    }
  }
  return { statuses: all, ok: anyOk, code: anyOk ? "200" : lastCode };
}

async function fetchPostexStats(from: string, to: string): Promise<CourierStats> {
  const stats: CourierStats = {
    total: 0, delivered: 0, outForDelivery: 0, onTheWay: 0,
    returned: 0, booked: 0, attempted: 0, cancelled: 0, other: 0,
  };

  const tokens: string[] = [];
  if (process.env.POSTEX_API_TOKEN) tokens.push(process.env.POSTEX_API_TOKEN);
  if (process.env.POSTEX_RETAIL_API_TOKEN) tokens.push(process.env.POSTEX_RETAIL_API_TOKEN);
  if (!process.env.POSTEX_API_TOKEN) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } }).catch(() => null);
    if (setting?.value) tokens.push(setting.value);
  }
  if (tokens.length === 0) return { ...stats, error: "config" };

  let anyOk = false;
  const codes: string[] = [];
  const results = await Promise.all(tokens.map((t) => fetchAccountOrders(t, from, to)));
  for (const r of results) {
    if (!r.ok) { codes.push(r.code); continue; }
    anyOk = true;
    for (const status of r.statuses) {
      stats.total += 1;
      stats[classifyStatus(status)] += 1;
    }
  }

  if (!anyOk) return { ...stats, error: `api:${[...new Set(codes)].join(", ") || "unknown"}` };
  return stats;
}

// ── Chart helpers (server-rendered SVG) ──────────────────
type Bucket = { label: string; revenue: number; orders: number };

function buildBuckets(orders: WebOrder[], from: string, to: string): Bucket[] {
  const single = from === to;
  const map = new Map<string, Bucket>();

  if (single) {
    for (let h = 0; h < 24; h += 2) {
      const label = `${String(h).padStart(2, "0")}:00`;
      map.set(label, { label, revenue: 0, orders: 0 });
    }
    for (const o of orders) {
      const hourPK = Number(o.date.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Karachi" }));
      const slot = Math.floor(hourPK / 2) * 2;
      const label = `${String(slot).padStart(2, "0")}:00`;
      const b = map.get(label);
      if (b) { b.revenue += o.totalAmount; b.orders += 1; }
    }
  } else {
    const start = new Date(`${from}T12:00:00+05:00`);
    const end = new Date(`${to}T12:00:00+05:00`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
      const label = d.toLocaleDateString("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
      map.set(key, { label, revenue: 0, orders: 0 });
    }
    for (const o of orders) {
      const key = o.date.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
      const b = map.get(key);
      if (b) { b.revenue += o.totalAmount; b.orders += 1; }
    }
  }
  return [...map.values()];
}

function BarChart({
  buckets, metric, color, valuePrefix = "",
}: {
  buckets: Bucket[];
  metric: "revenue" | "orders";
  color: string;
  valuePrefix?: string;
}) {
  const W = 560, H = 180, padL = 8, padR = 8, padB = 22, padT = 18;
  const values = buckets.map((b) => b[metric]);
  const max = Math.max(...values, 1);
  const n = buckets.length;
  const innerW = W - padL - padR;
  const gap = Math.min(6, Math.max(2, innerW / n / 4));
  const barW = Math.max(3, innerW / n - gap);
  const peakIdx = values.indexOf(Math.max(...values));

  const labelEvery = Math.ceil(n / 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${metric} chart`}>
      {/* recessive gridlines */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + (H - padT - padB) * (1 - f)} y2={padT + (H - padT - padB) * (1 - f)} stroke="#eef0ea" strokeWidth="1" />
      ))}
      {buckets.map((b, i) => {
        const v = b[metric];
        const h = Math.round(((H - padT - padB) * v) / max);
        const x = padL + (i * innerW) / n + gap / 2;
        const y = H - padB - h;
        const r = Math.min(4, barW / 2, h);
        return (
          <g key={i}>
            <path
              d={h > 0
                ? `M${x},${H - padB} v${-(h - r)} q0,${-r} ${r},${-r} h${barW - 2 * r} q${r},0 ${r},${r} v${h - r} z`
                : `M${x},${H - padB} h${barW} z`}
              fill={i === peakIdx && v > 0 ? "#BFD732" : color}
              opacity={v === 0 ? 0.15 : 1}
            >
              <title>{`${b.label}: ${valuePrefix}${v.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`}</title>
            </path>
            {i === peakIdx && v > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#16202E">
                {valuePrefix}{v.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
              </text>
            )}
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={H - 7} textAnchor="middle" fontSize="9" fill="#9ca3af">
                {b.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
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

  const dayStart = new Date(`${from}T00:00:00+05:00`);
  const dayEnd = new Date(`${to}T23:59:59+05:00`);

  const [{ orders, error }, courier, visitRows, meta] = await Promise.all([
    fetchWebOrders(from, to),
    fetchPostexStats(from, to),
    prisma.websiteVisit
      .findMany({ where: { createdAt: { gte: dayStart, lte: dayEnd } }, select: { visitorId: true } })
      .catch(() => []),
    fetchMetaStats(from, to),
  ]);

  const visitors = new Set(visitRows.map((v) => v.visitorId)).size;
  const pageViews = visitRows.length;

  // --- Metrics ---
  const total = orders.length;
  const revenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const avgOrder = total ? revenue / total : 0;

  const confirmed = orders.filter((o) => !o.draft).length;
  const conversionRate = pctNum(confirmed, total);
  const paidRevenue = orders.reduce((s, o) => s + o.paid, 0);

  // --- City breakdown ---
  const cityMap: Record<string, { orders: number; revenue: number }> = {};
  for (const o of orders) {
    const city = (o.city ?? "Unknown").trim() || "Unknown";
    if (!cityMap[city]) cityMap[city] = { orders: 0, revenue: 0 };
    cityMap[city].orders += 1;
    cityMap[city].revenue += o.totalAmount;
  }
  const cities = Object.entries(cityMap)
    .sort((a, b) => b[1].orders - a[1].orders)
    .slice(0, 10);

  const topCityOrders = cities[0]?.[1].orders ?? 0;

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

  return (
    <div className="max-w-5xl space-y-6 pb-8">
      {/* Header — brand hero */}
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap shadow-sm relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <div>
          <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Retail COD · The Boundary Shop</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sales Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Total Revenue</p>
          <p className="text-3xl font-bold tabular-nums text-[#BFD732]">Rs {fmt(revenue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{total} orders</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
          Could not load orders from the database. Try refreshing the page.
        </div>
      )}

      {/* Date picker */}
      <DateNav from={from} to={to} />

      {/* Traffic — always shown, even with zero orders */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <BigStat label="Website Visitors" value={String(visitors)} sub={pageViews !== visitors ? `${pageViews} page views` : undefined} />
        <BigStat label="Total Orders" value={String(total)} />
        <BigStat label="Visitor → Order" value={`${pctNum(total, visitors)}%`} sub="conversion" />
      </div>

      {/* Meta Ads — spend from Meta, revenue/ROAS from orders tagged source=meta_ads (see Ads Manager) */}
      {(() => {
        const adOrders = orders.filter((o) => isMetaAdOrder(o.source));
        const adRevenue = adOrders.reduce((s, o) => s + o.totalAmount, 0);
        const roas = meta.spend > 0 ? adRevenue / meta.spend : 0;
        return (
          <>
            {!meta.error && (meta.spend > 0 || adRevenue > 0) && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-[#1877F2]">
                      <circle cx="10" cy="10" r="8.5" fill="#1877F2" />
                      <path d="M11.7 10.2h1.6l.25-1.7h-1.85V7.4c0-.5.13-.83.85-.83h.9V5.06c-.15-.02-.68-.06-1.3-.06-1.28 0-2.16.78-2.16 2.22v1.28H8.4v1.7h1.6V15h1.7v-4.8Z" fill="#fff" />
                    </svg>
                    <p className="text-sm font-semibold text-gray-800">Meta Ads</p>
                  </div>
                  <a href="/ecommerce/ads-manager" className="text-xs text-gray-400 hover:text-[#16202E] transition-colors">Full report →</a>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <MetaStat label="Ad Spend" value={`Rs ${fmt(meta.spend)}`} />
                  <MetaStat label="Revenue from Ads" value={`Rs ${fmt(adRevenue)}`} />
                  <MetaStat
                    label="ROAS"
                    value={roas.toFixed(2) + "x"}
                    accent={roas >= 2 ? "good" : roas > 0 ? "warn" : undefined}
                  />
                </div>
              </div>
            )}
            {meta.error && meta.error !== "config" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-xs text-amber-700">
                Meta ad spend unavailable ({meta.error.replace("api:", "code ")}). Check META_ACCESS_TOKEN / META_AD_ACCOUNT_ID.
              </div>
            )}
          </>
        );
      })()}

      {total > 0 ? (
        <>
          {/* Row 1 — key numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <BigStat label="Confirmed Orders" value={String(confirmed)} sub={pct(confirmed, total)} />
            <BigStat label="Avg Order Value" value={`Rs ${fmt(avgOrder)}`} />
            <BigStat label="Confirmation Rate" value={`${conversionRate}%`} sub="confirmed / total" />
            <BigStat label="Gross Revenue" value={`Rs ${fmt(revenue)}`} />
          </div>

          {/* Trend charts */}
          {(() => {
            const buckets = buildBuckets(orders, from, to);
            const single = from === to;
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-800">Revenue {single ? "by Hour" : "by Day"}</p>
                    <span className="text-xs text-gray-400">Rs {fmt(revenue)} total</span>
                  </div>
                  <BarChart buckets={buckets} metric="revenue" color="#16202E" valuePrefix="Rs " />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-800">Orders {single ? "by Hour" : "by Day"}</p>
                    <span className="text-xs text-gray-400">{total} total</span>
                  </div>
                  <BarChart buckets={buckets} metric="orders" color="#5a6b7c" />
                </div>
              </div>
            );
          })()}

          {/* Revenue strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RevenueCard label="Advance Received" value={`Rs ${fmt(paidRevenue)}`} sub="payments recorded" />
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

      {/* ── Courier (PostEx) ─────────────────────────── */}
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

function MetaStat({ label, value, accent }: { label: string; value: string; accent?: "good" | "warn" }) {
  const color = accent === "good" ? "text-emerald-600" : accent === "warn" ? "text-amber-600" : "text-[#16202E]";
  return (
    <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-4">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`text-2xl font-bold tabular-nums leading-none ${color}`}>{value}</p>
    </div>
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
