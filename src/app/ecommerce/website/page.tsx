import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DateRangeNav from "@/components/DateRangeNav";
import { fetchWebOrders } from "@/lib/webOrders";

export const maxDuration = 60;

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function pctNum(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

type DayPoint = { key: string; label: string; visitors: number; orders: number; revenue: number };

function buildDayPoints(
  visitRows: { visitorId: string; createdAt: Date }[],
  orders: { date: Date; totalAmount: number }[],
  from: string,
  to: string
): DayPoint[] {
  const map = new Map<string, DayPoint>();
  const start = new Date(`${from}T12:00:00+05:00`);
  const end = new Date(`${to}T12:00:00+05:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
    const label = d.toLocaleDateString("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
    map.set(key, { key, label, visitors: 0, orders: 0, revenue: 0 });
  }

  const visitorsByDay = new Map<string, Set<string>>();
  for (const v of visitRows) {
    const key = v.createdAt.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
    if (!visitorsByDay.has(key)) visitorsByDay.set(key, new Set());
    visitorsByDay.get(key)!.add(v.visitorId);
  }
  for (const [key, set] of visitorsByDay) {
    const b = map.get(key);
    if (b) b.visitors = set.size;
  }

  for (const o of orders) {
    const key = o.date.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
    const b = map.get(key);
    if (b) { b.orders += 1; b.revenue += o.totalAmount; }
  }

  return [...map.values()];
}

function DualBarChart({ points }: { points: DayPoint[] }) {
  const W = 560, H = 200, padL = 8, padR = 8, padB = 22, padT = 18;
  const maxVisitors = Math.max(...points.map((p) => p.visitors), 1);
  const n = points.length;
  const innerW = W - padL - padR;
  const gap = Math.min(6, Math.max(2, innerW / n / 5));
  const groupW = innerW / n - gap;
  const barW = Math.max(2, groupW / 2 - 1);
  const labelEvery = Math.ceil(n / 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Visitors vs orders chart">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + (H - padT - padB) * (1 - f)} y2={padT + (H - padT - padB) * (1 - f)} stroke="#eef0ea" strokeWidth="1" />
      ))}
      {points.map((p, i) => {
        const vh = Math.round(((H - padT - padB) * p.visitors) / maxVisitors);
        const oh = Math.round(((H - padT - padB) * p.orders) / maxVisitors);
        const gx = padL + (i * innerW) / n + gap / 2;
        return (
          <g key={p.key}>
            <rect x={gx} y={H - padB - vh} width={barW} height={vh} fill="#5a6b7c" rx="2">
              <title>{`${p.label}: ${p.visitors} visitors`}</title>
            </rect>
            <rect x={gx + barW + 2} y={H - padB - oh} width={barW} height={oh} fill="#BFD732" rx="2">
              <title>{`${p.label}: ${p.orders} orders`}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text x={gx + groupW / 2} y={H - 7} textAnchor="middle" fontSize="9" fill="#9ca3af">
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ConversionLineChart({ points }: { points: DayPoint[] }) {
  const W = 560, H = 140, padL = 8, padR = 8, padB = 22, padT = 18;
  const conv = points.map((p) => pctNum(p.orders, p.visitors));
  const max = Math.max(...conv, 5);
  const n = points.length;
  const innerW = W - padL - padR;
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  const labelEvery = Math.ceil(n / 8);

  function y(v: number) {
    return padT + (H - padT - padB) * (1 - v / max);
  }

  const linePath = conv.map((v, i) => `${i === 0 ? "M" : "L"}${padL + i * stepX},${y(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Conversion rate trend">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + (H - padT - padB) * (1 - f)} y2={padT + (H - padT - padB) * (1 - f)} stroke="#eef0ea" strokeWidth="1" />
      ))}
      <path d={linePath} fill="none" stroke="#16202E" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {conv.map((v, i) => (
        <circle key={i} cx={padL + i * stepX} cy={y(v)} r="2.5" fill="#BFD732" stroke="#16202E" strokeWidth="1">
          <title>{`${points[i].label}: ${v}%`}</title>
        </circle>
      ))}
      {points.map((p, i) => (
        i % labelEvery === 0 ? (
          <text key={p.key} x={padL + i * stepX} y={H - 7} textAnchor="middle" fontSize="9" fill="#9ca3af">
            {p.label}
          </text>
        ) : null
      ))}
    </svg>
  );
}

export default async function WebsiteAnalyticsPage({
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

  const [visitRows, { orders }] = await Promise.all([
    prisma.websiteVisit
      .findMany({ where: { createdAt: { gte: dayStart, lte: dayEnd } }, select: { visitorId: true, path: true, createdAt: true } })
      .catch(() => []),
    fetchWebOrders(from, to),
  ]);

  const visitors = new Set(visitRows.map((v) => v.visitorId)).size;
  const pageViews = visitRows.length;
  const totalOrders = orders.length;
  const revenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const conversionRate = pctNum(totalOrders, visitors);
  const avgOrderValue = totalOrders ? revenue / totalOrders : 0;

  // Top pages
  const pageMap = new Map<string, number>();
  for (const v of visitRows) {
    const p = v.path ?? "(unknown)";
    pageMap.set(p, (pageMap.get(p) ?? 0) + 1);
  }
  const topPages = [...pageMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const points = buildDayPoints(visitRows, orders, from, to);

  const dateLabel =
    from === to
      ? new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `${new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short" })} — ${new Date(`${to}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="max-w-5xl space-y-6 pb-8">
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Analytics · The Boundary Shop</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Website</h1>
        <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
      </div>

      <DateRangeNav from={from} to={to} basePath="/ecommerce/website" />

      {/* Headline stats — always shown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <BigStat label="Visitors" value={fmt(visitors)} sub={pageViews !== visitors ? `${fmt(pageViews)} page views` : undefined} />
        <BigStat label="Orders" value={fmt(totalOrders)} />
        <BigStat label="Conversion" value={`${conversionRate}%`} sub="visitor → order" />
        <BigStat label="Revenue" value={`Rs ${fmt(revenue)}`} />
        <BigStat label="Avg Order Value" value={`Rs ${fmt(avgOrderValue)}`} />
        <BigStat label="Page Views" value={fmt(pageViews)} sub={visitors > 0 ? `${(pageViews / visitors).toFixed(1)} / visitor` : undefined} />
      </div>

      {/* Visitors vs Orders trend */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Visitors vs Orders {from === to ? "" : "by Day"}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2 h-2 rounded-full bg-[#5a6b7c]" />Visitors</span>
            <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2 h-2 rounded-full bg-[#BFD732]" />Orders</span>
          </div>
        </div>
        <DualBarChart points={points} />
      </div>

      {/* Conversion trend */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Conversion Rate Trend</p>
          <span className="text-xs text-gray-400">{conversionRate}% overall</span>
        </div>
        <ConversionLineChart points={points} />
      </div>

      {/* Top pages */}
      {topPages.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Top Pages</p>
            <span className="text-xs text-gray-400">by page views</span>
          </div>
          <div className="divide-y divide-gray-50">
            {topPages.map(([page, count]) => (
              <div key={page} className="flex items-center gap-4 px-5 py-3">
                <span className="text-sm text-gray-700 truncate flex-1 font-mono">{page}</span>
                <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">{fmt(count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {visitors === 0 && totalOrders === 0 && (
        <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <p className="text-sm font-medium text-gray-500">No traffic or orders in this date range</p>
          <p className="text-xs text-gray-400 mt-1">Try a different date range</p>
        </div>
      )}
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
