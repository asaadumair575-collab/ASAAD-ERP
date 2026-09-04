import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchMetaStats, fetchActiveCreatives } from "@/lib/metaAds";
import { fetchWebOrders, isMetaAdOrder, type WebOrder } from "@/lib/webOrders";
import DateRangeNav from "@/components/DateRangeNav";
import AdsManagerCharts, { type AdsDailyPoint } from "@/components/AdsManagerCharts";

export const maxDuration = 30;

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

// One bucket per calendar day in [from, to] (Asia/Karachi), merging Meta's
// per-day spend with our own tagged-order revenue for that day.
function buildDailyPoints(
  dailySpend: { date: string; spend: number }[],
  adOrders: WebOrder[],
  from: string,
  to: string
): AdsDailyPoint[] {
  const map = new Map<string, AdsDailyPoint>();
  const start = new Date(`${from}T12:00:00+05:00`);
  const end = new Date(`${to}T12:00:00+05:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
    const label = d.toLocaleDateString("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
    map.set(key, { date: label, spend: 0, revenue: 0, roas: 0, orders: 0 });
  }
  for (const m of dailySpend) {
    const b = map.get(m.date);
    if (b) b.spend += m.spend;
  }
  for (const o of adOrders) {
    const key = o.date.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
    const b = map.get(key);
    if (b) { b.revenue += o.totalAmount; b.orders += 1; }
  }
  for (const b of map.values()) b.roas = b.spend > 0 ? b.revenue / b.spend : 0;
  return [...map.values()];
}

export default async function AdsManagerPage({
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
  const rangeKey = `${from}_${to}`;

  const dateLabel =
    from === to
      ? new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `${new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short" })} — ${new Date(`${to}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="max-w-5xl space-y-6 pb-8">
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap relative overflow-hidden shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#1877F2]" />
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 text-[#8fb8f5]">
              <path d="M3 10a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 6.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[11px] font-semibold text-[#8fb8f5] uppercase tracking-[0.18em]">Meta Ads · The Boundary Shop</p>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Ads Manager</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5">
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-[#1877F2]">
            <circle cx="10" cy="10" r="8.5" fill="#1877F2" />
            <path d="M11.7 10.2h1.6l.25-1.7h-1.85V7.4c0-.5.13-.83.85-.83h.9V5.06c-.15-.02-.68-.06-1.3-.06-1.28 0-2.16.78-2.16 2.22v1.28H8.4v1.7h1.6V15h1.7v-4.8Z" fill="#fff" />
          </svg>
          <span className="text-xs text-gray-300 font-medium">Facebook + Instagram</span>
        </div>
      </div>

      <DateRangeNav from={from} to={to} basePath="/ecommerce/ads-manager" />

      <Suspense key={rangeKey} fallback={<AdsSkeleton />}>
        <AdsContent from={from} to={to} />
      </Suspense>
    </div>
  );
}

async function AdsContent({ from, to }: { from: string; to: string }) {
  const [meta, { orders }, creativesResult] = await Promise.all([
    fetchMetaStats(from, to),
    fetchWebOrders(from, to),
    fetchActiveCreatives(from, to),
  ]);
  const adOrders = orders.filter((o) => isMetaAdOrder(o.source));
  const revenue = adOrders.reduce((s, o) => s + o.totalAmount, 0);
  const roas = meta.spend > 0 ? revenue / meta.spend : 0;
  const totalOrders = orders.length;
  const totalWebsiteRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const untaggedOrders = orders.filter((o) => !o.source).length;

  const dailyPoints = from === to ? [] : buildDailyPoints(meta.daily, adOrders, from, to);

  if (meta.error === "config") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800 space-y-1">
        <p><strong>Not configured.</strong> Add these in Vercel → Settings → Environment Variables, then redeploy:</p>
        <ul className="list-disc pl-5">
          <li><code>META_ACCESS_TOKEN</code> — your Meta Marketing API access token</li>
          <li><code>META_AD_ACCOUNT_ID</code> — e.g. <code>act_1363299608334913</code></li>
        </ul>
      </div>
    );
  }

  if (meta.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700 space-y-1">
        <p><strong>Could not load Meta Ads data ({meta.error}).</strong></p>
        {meta.detail && <p className="text-xs text-red-600">{meta.detail}</p>}
        <p className="text-xs text-red-600 mt-1">
          Common causes: token expired (short-lived tokens last ~1-2 hours — generate a long-lived System User token),
          token missing the <code>ads_read</code> permission, or the token&apos;s user doesn&apos;t have access to this ad account.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Headline row — spend, verified revenue, ROAS side by side */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Verified — from your website orders</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Ad Spend" value={`Rs ${fmt(meta.spend)}`} accent="bg-[#1877F2]" />
          <StatCard label="Revenue from Ads" value={`Rs ${fmt(revenue)}`} sub={`${adOrders.length} tagged orders`} accent="bg-[#BFD732]" />
          <StatCard
            label="ROAS"
            value={`${roas.toFixed(2)}x`}
            accent={roas >= 2 ? "bg-emerald-500" : roas > 0 ? "bg-amber-400" : "bg-gray-200"}
            valueClass={roas >= 2 ? "text-emerald-600" : roas > 0 ? "text-amber-600" : "text-[#16202E]"}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Revenue and ROAS are counted only from orders tagged <code>source: &quot;meta_ads&quot;</code> by the
          storefront. Requires the storefront to send that tag — see the note below if it&apos;s missing.
        </p>
      </div>

      {/* Total website sale — all orders in range, ad-tagged or not */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16202E]" />
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Website Sale (all orders)</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums text-[#16202E]">Rs {fmt(totalWebsiteRevenue)}</p>
            <p className="text-[11px] text-gray-400">{totalOrders} orders</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums text-[#16202E]">{adOrders.length}</p>
            <p className="text-[11px] text-gray-400">from ads ({totalOrders ? Math.round((adOrders.length / totalOrders) * 100) : 0}%)</p>
          </div>
        </div>
      </div>

      {/* Daily trend */}
      {dailyPoints.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Daily Performance</p>
          <AdsManagerCharts data={dailyPoints} />
        </div>
      )}

      {/* Active creatives — what's running right now and what each is spending */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Active Ad Creatives</p>
            <p className="text-xs text-gray-400 mt-0.5">Currently running, spend shown for the selected range</p>
          </div>
          {creativesResult.creatives.length > 0 && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{creativesResult.creatives.length} active</span>
          )}
        </div>

        {creativesResult.error === "config" ? (
          <p className="px-5 py-6 text-sm text-gray-400">Meta Ads not configured — see note above.</p>
        ) : creativesResult.error ? (
          <div className="px-5 py-4 text-sm text-red-600">
            Could not load active creatives ({creativesResult.error}).
            {creativesResult.detail && <span className="block text-xs text-red-500 mt-1">{creativesResult.detail}</span>}
          </div>
        ) : creativesResult.creatives.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">No ads are currently active on this account.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {creativesResult.creatives.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                {c.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 truncate">{c.campaignName} · {c.adsetName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums text-[#16202E]">Rs {fmt(c.spend)}</p>
                  <p className="text-[11px] text-gray-400">
                    {c.dailyBudget != null ? `Rs ${fmt(c.dailyBudget)}/day` : c.lifetimeBudget != null ? `Rs ${fmt(c.lifetimeBudget)} lifetime` : "no budget set"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        {untaggedOrders > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-xs text-amber-800">
            <strong>{untaggedOrders} of {totalOrders} orders</strong> in this range have no traffic source tag, so they
            aren&apos;t counted above as ad or organic. The storefront needs to send a <code>source</code> field
            (e.g. <code>meta_ads</code>) when creating each order.
          </div>
        )}

        {/* Meta-reported — shown for comparison, but confirmed unreliable on this account */}
        <details className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3">
          <summary className="text-xs font-semibold text-gray-500 cursor-pointer select-none">
            Meta&apos;s own reported number (do not use — known to be inflated on this account)
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Revenue (Meta-reported)</p>
              <p className="text-lg font-bold tabular-nums text-gray-400 line-through decoration-red-300">Rs {fmt(meta.reportedRevenue)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">ROAS (Meta-reported)</p>
              <p className="text-lg font-bold tabular-nums text-gray-400 line-through decoration-red-300">{meta.reportedRoas.toFixed(2)}x</p>
            </div>
          </div>
          <p className="text-xs text-red-500 mt-2">
            Confirmed inaccurate — Meta reported Rs 280k for a period where actual recorded sales were Rs 380.
            Meta&apos;s click/view attribution window over-counts conversions that weren&apos;t really driven by
            ads. Treat &quot;Verified&quot; numbers above as the source of truth.
          </p>
        </details>
      </div>

      {meta.spend === 0 && revenue === 0 && meta.reportedRevenue === 0 && (
        <div className="border border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-sm font-medium text-gray-500">No ad spend or ad-attributed orders in this date range</p>
          <p className="text-xs text-gray-400 mt-1">Try a different date range, or check that campaigns were active</p>
        </div>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = "bg-[#16202E]",
  valueClass = "text-[#16202E]",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function AdsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="h-24 bg-gray-100 rounded-2xl" />
        <div className="h-24 bg-gray-100 rounded-2xl" />
        <div className="h-24 bg-gray-100 rounded-2xl" />
      </div>
      <div className="h-64 bg-gray-100 rounded-2xl" />
    </div>
  );
}
