import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchCreativeDetail } from "@/lib/metaAds";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "border-green-200 bg-green-50 text-green-700" },
  PAUSED: { label: "Paused", cls: "border-gray-200 bg-gray-50 text-gray-500" },
};

export default async function CreativeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { id } = await params;
  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const { from = todayPK, to = todayPK } = await searchParams;

  const { creative, error, detail } = await fetchCreativeDetail(id, from, to);

  return (
    <div className="max-w-3xl space-y-6 pb-8">
      <Link href={`/ecommerce/ads-manager?from=${from}&to=${to}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-black transition-colors">
        <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5"><path d="M7.5 2.5l-4 3.5 4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to Ads Manager
      </Link>

      {error ? (
        <div className="border border-red-200 bg-red-50 rounded-2xl p-6 text-sm text-red-700">
          Could not load this ad ({error}).
          {detail && <span className="block text-xs text-red-500 mt-1">{detail}</span>}
        </div>
      ) : !creative ? (
        <div className="border border-gray-200 rounded-2xl p-6 text-sm text-gray-400">Ad not found.</div>
      ) : (
        <>
          <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Ad Creative</p>
                <h1 className="text-xl font-bold text-white tracking-tight truncate">{creative.name}</h1>
                <p className="text-sm text-gray-400 mt-0.5 truncate">{creative.campaignName} · {creative.adsetName}</p>
              </div>
              {(() => {
                const s = STATUS_META[creative.status] ?? { label: creative.status, cls: "border-gray-200 bg-gray-50 text-gray-500" };
                return (
                  <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${s.cls}`}>
                    {s.label}
                  </span>
                );
              })()}
            </div>
          </div>

          {(creative.imageUrl || creative.thumbnailUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creative.imageUrl ?? creative.thumbnailUrl!}
              alt={creative.name}
              className="w-full max-h-[420px] object-contain bg-gray-50 rounded-2xl border border-gray-200"
            />
          )}

          {(creative.title || creative.body) && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-1.5">
              {creative.title && <p className="text-sm font-semibold text-gray-900">{creative.title}</p>}
              {creative.body && <p className="text-sm text-gray-500 whitespace-pre-wrap">{creative.body}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Spend" value={`Rs ${fmt(creative.spend)}`} />
            <Stat label="Impressions" value={fmt(creative.impressions)} />
            <Stat label="Reach" value={fmt(creative.reach)} />
            <Stat label="Clicks" value={fmt(creative.clicks)} />
            <Stat label="CTR" value={`${creative.ctr.toFixed(2)}%`} />
            <Stat label="CPC" value={`Rs ${fmt(creative.cpc)}`} />
            <Stat label="Purchases" value={fmt(creative.purchases)} />
            <Stat label="Budget" value={creative.dailyBudget != null ? `Rs ${fmt(creative.dailyBudget)}/day` : creative.lifetimeBudget != null ? `Rs ${fmt(creative.lifetimeBudget)} lifetime` : "—"} />
          </div>

          <p className="text-xs text-gray-400">
            Stats for {from === to ? from : `${from} — ${to}`}, straight from Meta.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-[#16202E] tabular-nums mt-1">{value}</p>
    </div>
  );
}
