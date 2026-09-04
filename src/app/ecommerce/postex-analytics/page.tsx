import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DateRangeNav from "@/components/DateRangeNav";
import PostexAnalyticsCharts, { type PostexDailyPoint } from "@/components/PostexAnalyticsCharts";

export const maxDuration = 30;

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function PostexAnalyticsPage({
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
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Courier · The Boundary Shop</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Postex Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
      </div>

      <DateRangeNav from={from} to={to} basePath="/ecommerce/postex-analytics" />

      <Suspense key={rangeKey} fallback={<Skeleton />}>
        <PostexContent from={from} to={to} />
      </Suspense>
    </div>
  );
}

async function PostexContent({ from, to }: { from: string; to: string }) {
  const dayStart = new Date(`${from}T00:00:00+05:00`);
  const dayEnd = new Date(`${to}T23:59:59+05:00`);
  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const todayStart = new Date(`${todayPK}T00:00:00+05:00`);
  const todayEnd = new Date(`${todayPK}T23:59:59+05:00`);

  // "Ongoing" = booked on Postex, not yet delivered (status=PAID) or returned.
  const [ongoing, bookedInRange, bookedToday, allSheets] = await Promise.all([
    prisma.ecomOrder.findMany({
      where: { trackingNumber: { not: null }, returned: false, status: { not: "PAID" } },
      select: { id: true, customerName: true, city: true, totalAmount: true, trackingNumber: true, packedAt: true, dispatchedAt: true, notes: true },
    }),
    prisma.ecomOrder.findMany({
      where: { dispatchedAt: { gte: dayStart, lte: dayEnd } },
      select: { id: true, totalAmount: true, dispatchedAt: true },
    }),
    prisma.ecomOrder.findMany({
      where: { dispatchedAt: { gte: todayStart, lte: todayEnd } },
      select: { id: true, totalAmount: true },
    }),
    prisma.dispatchSheet.findMany({ select: { orderIds: true, dispatchedAt: true } }),
  ]);

  const dispatchedOrderIds = new Set(allSheets.filter((s) => s.dispatchedAt).flatMap((s) => s.orderIds));

  // Weight (from Scan & Weigh) for ongoing parcels, if known.
  const ongoingTrackingNumbers = ongoing.map((o) => o.trackingNumber).filter((t): t is string => !!t);
  const verifications = ongoingTrackingNumbers.length
    ? await prisma.weightVerification.findMany({
        where: { trackingNumber: { in: ongoingTrackingNumbers } },
        orderBy: { createdAt: "asc" },
        select: { trackingNumber: true, weight: true },
      })
    : [];
  const weightByTracking = new Map<string, number>();
  for (const v of verifications) weightByTracking.set(v.trackingNumber, v.weight);

  const totalOngoingParcels = ongoing.length;
  const totalOngoingValue = ongoing.reduce((s, o) => s + o.totalAmount, 0);
  const totalOngoingWeight = ongoing.reduce((s, o) => s + (o.trackingNumber ? weightByTracking.get(o.trackingNumber) ?? 0 : 0), 0);

  const biggestByValue = [...ongoing].sort((a, b) => b.totalAmount - a.totalAmount)[0] ?? null;
  const biggestByWeight = [...ongoing]
    .filter((o) => o.trackingNumber && weightByTracking.has(o.trackingNumber))
    .sort((a, b) => (weightByTracking.get(b.trackingNumber!) ?? 0) - (weightByTracking.get(a.trackingNumber!) ?? 0))[0] ?? null;

  const todayCount = bookedToday.length;
  const todayValue = bookedToday.reduce((s, o) => s + o.totalAmount, 0);

  // Status breakdown of currently ongoing parcels.
  const booked = ongoing.filter((o) => !o.packedAt).length;
  const packed = ongoing.filter((o) => o.packedAt && !dispatchedOrderIds.has(o.id)).length;
  const dispatched = ongoing.filter((o) => dispatchedOrderIds.has(o.id)).length;

  // City breakdown of ongoing parcels.
  const cityMap = new Map<string, { count: number; value: number }>();
  for (const o of ongoing) {
    const city = o.city?.trim() || "Unknown";
    const b = cityMap.get(city) ?? { count: 0, value: 0 };
    b.count += 1;
    b.value += o.totalAmount;
    cityMap.set(city, b);
  }
  const cityBreakdown = [...cityMap.entries()].map(([city, v]) => ({ city, ...v })).sort((a, b) => b.count - a.count);

  // Daily booking trend for the selected date range.
  const dailyMap = new Map<string, PostexDailyPoint>();
  const startD = new Date(`${from}T12:00:00+05:00`);
  const endD = new Date(`${to}T12:00:00+05:00`);
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
    const label = d.toLocaleDateString("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
    dailyMap.set(key, { date: label, parcels: 0, amount: 0 });
  }
  for (const o of bookedInRange) {
    const key = o.dispatchedAt!.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
    const b = dailyMap.get(key);
    if (b) { b.parcels += 1; b.amount += o.totalAmount; }
  }
  const dailyPoints = [...dailyMap.values()];

  const orderLabel = (o: { id: number; notes: string | null }) => o.notes?.replace("Shopify Order ", "") ?? `#${o.id}`;

  return (
    <>
      {/* Headline */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Ongoing Parcels" value={fmt(totalOngoingParcels)} sub="With Postex, not yet delivered" accent="bg-[#16202E]" />
        <StatCard label="Ongoing Value" value={`Rs ${fmt(totalOngoingValue)}`} sub={totalOngoingWeight > 0 ? `${totalOngoingWeight.toFixed(2)} kg total` : undefined} accent="bg-[#BFD732]" />
        <StatCard label="Booked Today" value={fmt(todayCount)} sub={`Rs ${fmt(todayValue)}`} accent="bg-blue-500" />
      </div>

      {/* Biggest parcels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Biggest Parcel (by value)</p>
          {biggestByValue ? (
            <>
              <p className="text-2xl font-bold tabular-nums text-[#16202E]">Rs {fmt(biggestByValue.totalAmount)}</p>
              <p className="text-xs text-gray-400 mt-1">{orderLabel(biggestByValue)} — {biggestByValue.customerName} · {biggestByValue.city ?? "—"}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No ongoing parcels</p>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Biggest Parcel (by weight)</p>
          {biggestByWeight ? (
            <>
              <p className="text-2xl font-bold tabular-nums text-[#16202E]">{weightByTracking.get(biggestByWeight.trackingNumber!)!.toFixed(2)} kg</p>
              <p className="text-xs text-gray-400 mt-1">{orderLabel(biggestByWeight)} — {biggestByWeight.customerName} · {biggestByWeight.city ?? "—"}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No weighed parcels yet</p>
          )}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">Ongoing Parcels by Status</p>
        <div className="grid grid-cols-3 gap-3">
          <StatusPill label="Booked" count={booked} total={totalOngoingParcels} color="bg-blue-400" />
          <StatusPill label="Packed" count={packed} total={totalOngoingParcels} color="bg-emerald-500" />
          <StatusPill label="Dispatched" count={dispatched} total={totalOngoingParcels} color="bg-teal-500" />
        </div>
      </div>

      {/* Daily trend */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">Daily Bookings</p>
        <PostexAnalyticsCharts data={dailyPoints} />
      </div>

      {/* City breakdown */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Ongoing Parcels by City</p>
          <p className="text-xs text-gray-400 mt-0.5">Where the parcels currently with Postex are going</p>
        </div>
        {cityBreakdown.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">No ongoing parcels.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {cityBreakdown.map((c) => (
              <div key={c.city} className="px-5 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{c.city}</p>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-[#16202E] rounded-full"
                      style={{ width: `${totalOngoingParcels > 0 ? (c.count / totalOngoingParcels) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums text-[#16202E]">{c.count} parcel{c.count === 1 ? "" : "s"}</p>
                  <p className="text-[11px] text-gray-400 tabular-nums">Rs {fmt(c.value)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = "bg-[#16202E]",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-bold tabular-nums text-[#16202E]">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function StatusPill({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1.5">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-[#16202E]">{count}</p>
      <p className="text-[11px] text-gray-400">{pct}%</p>
    </div>
  );
}

function Skeleton() {
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
