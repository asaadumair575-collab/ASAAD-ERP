import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchMetaStats } from "@/lib/metaAds";
import { fetchWebOrders, isMetaAdOrder } from "@/lib/webOrders";
import DateRangeNav from "@/components/DateRangeNav";

export const maxDuration = 30;

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
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

  const [meta, { orders }] = await Promise.all([fetchMetaStats(from, to), fetchWebOrders(from, to)]);
  const adOrders = orders.filter((o) => isMetaAdOrder(o.source));
  const revenue = adOrders.reduce((s, o) => s + o.totalAmount, 0);
  const roas = meta.spend > 0 ? revenue / meta.spend : 0;
  const totalOrders = orders.length;
  const untaggedOrders = orders.filter((o) => !o.source).length;

  const dateLabel =
    from === to
      ? new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `${new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short" })} — ${new Date(`${to}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="max-w-3xl space-y-6 pb-8">
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#1877F2]" />
        <p className="text-[11px] font-semibold text-[#8fb8f5] uppercase tracking-[0.18em] mb-1">Meta Ads · The Boundary Shop</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Ads Manager</h1>
        <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
      </div>

      <DateRangeNav from={from} to={to} basePath="/ecommerce/ads-manager" />

      {meta.error === "config" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800 space-y-1">
          <p><strong>Not configured.</strong> Add these in Vercel → Settings → Environment Variables, then redeploy:</p>
          <ul className="list-disc pl-5">
            <li><code>META_ACCESS_TOKEN</code> — your Meta Marketing API access token</li>
            <li><code>META_AD_ACCOUNT_ID</code> — e.g. <code>act_1363299608334913</code></li>
          </ul>
        </div>
      )}

      {meta.error && meta.error !== "config" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700 space-y-1">
          <p><strong>Could not load Meta Ads data ({meta.error}).</strong></p>
          {meta.detail && <p className="text-xs text-red-600">{meta.detail}</p>}
          <p className="text-xs text-red-600 mt-1">
            Common causes: token expired (short-lived tokens last ~1-2 hours — generate a long-lived System User token),
            token missing the <code>ads_read</code> permission, or the token&apos;s user doesn&apos;t have access to this ad account.
          </p>
        </div>
      )}

      {!meta.error && (
        <>
          {/* Ad spend — the one number Meta reports accurately */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#1877F2]" />
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ad Spend</p>
            <p className="text-3xl font-bold tabular-nums text-[#16202E]">Rs {fmt(meta.spend)}</p>
          </div>

          {/* Verified — from our own tagged orders */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Verified — from your website orders</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#BFD732]" />
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Revenue from Ads</p>
                <p className="text-3xl font-bold tabular-nums text-[#16202E]">Rs {fmt(revenue)}</p>
                <p className="text-xs text-gray-400 mt-1">{adOrders.length} tagged orders</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${roas >= 2 ? "bg-emerald-500" : roas > 0 ? "bg-amber-400" : "bg-gray-200"}`} />
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">ROAS</p>
                <p className={`text-3xl font-bold tabular-nums ${roas >= 2 ? "text-emerald-600" : roas > 0 ? "text-amber-600" : "text-[#16202E]"}`}>
                  {roas.toFixed(2)}x
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Counted only from orders tagged <code>source: &quot;meta_ads&quot;</code> by the storefront. Requires the
              storefront to send that tag — see the note below if it&apos;s missing.
            </p>
          </div>

          {/* Meta-reported — self-attributed, available for older dates too */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1877F2]" />
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Meta-reported — estimated by Meta&apos;s own attribution</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#1877F2] opacity-40" />
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Revenue (Meta-reported)</p>
                <p className="text-3xl font-bold tabular-nums text-gray-500">Rs {fmt(meta.reportedRevenue)}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#1877F2] opacity-40" />
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">ROAS (Meta-reported)</p>
                <p className="text-3xl font-bold tabular-nums text-gray-500">{meta.reportedRoas.toFixed(2)}x</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              This is Meta&apos;s own conversion tracking (click/view attribution) — useful for dates before order
              tagging existed, but can be inflated. This is the only number available for orders placed on Shopify
              before the website switch.
            </p>
          </div>

          {untaggedOrders > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-xs text-amber-800">
              <strong>{untaggedOrders} of {totalOrders} orders</strong> in this range have no traffic source tag, so they
              aren&apos;t counted in the &quot;Verified&quot; numbers above as ad or organic. The storefront needs to
              send a <code>source</code> field (e.g. <code>meta_ads</code>) when creating each order.
            </div>
          )}

          {meta.spend === 0 && revenue === 0 && meta.reportedRevenue === 0 && (
            <div className="border border-dashed border-gray-200 rounded-2xl p-12 text-center">
              <p className="text-sm font-medium text-gray-500">No ad spend or ad-attributed orders in this date range</p>
              <p className="text-xs text-gray-400 mt-1">Try a different date range, or check that campaigns were active</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
