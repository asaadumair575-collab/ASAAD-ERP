import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { fetchPostexStats } from "@/lib/postexStats";
import DashboardDateNav from "@/components/DashboardDateNav";

export const maxDuration = 60;

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function pct(a: number, b: number) {
  if (!b) return "0%";
  return `${Math.round((a / b) * 100)}%`;
}

type RetailOrderRow = {
  totalAmount: number;
  status: string;
  dispatched: boolean;
  city: string | null;
  received: number;
};

async function fetchRetailOrders(from: string, to: string): Promise<RetailOrderRow[]> {
  const dayStart = new Date(`${from}T00:00:00+05:00`);
  const dayEnd = new Date(`${to}T23:59:59+05:00`);
  const orders = await prisma.retailOrder.findMany({
    where: { date: { gte: dayStart, lte: dayEnd } },
    select: {
      totalAmount: true,
      status: true,
      dispatched: true,
      city: true,
      payments: { select: { amount: true } },
    },
  });
  return orders.map((o) => ({
    totalAmount: o.totalAmount,
    status: o.status,
    dispatched: o.dispatched,
    city: o.city,
    received: o.payments.reduce((s, p) => s + p.amount, 0),
  }));
}

export default async function RetailAllDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;

  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const from = fromParam ?? todayPK;
  const to = toParam ?? todayPK;

  const dateLabel =
    from === to
      ? new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : `${new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short" })} — ${new Date(`${to}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`;

  // Kick off the DB fetch once; the hero and the stats section both await it
  // inside their own Suspense boundaries so the shell (header + date buttons)
  // renders immediately and the data streams in behind skeletons.
  const ordersPromise = fetchRetailOrders(from, to);
  const rangeKey = `${from}_${to}`;

  return (
    <div className="max-w-5xl space-y-6 pb-8">
      {/* Header — brand hero */}
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap shadow-sm relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <div>
          <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Retail · Cash on Delivery</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">All Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Total Billed</p>
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
            <HeroBilled ordersPromise={ordersPromise} />
          </Suspense>
        </div>
      </div>

      {/* Date picker — always interactive, never blocked by data */}
      <DashboardDateNav from={from} to={to} today={todayPK} basePath="/retail/all-dashboard" />

      <Suspense key={`stats-${rangeKey}`} fallback={<StatsSkeleton />}>
        <RetailSection ordersPromise={ordersPromise} />
      </Suspense>

      <Suspense key={`courier-${rangeKey}`} fallback={<CourierSkeleton dateLabel={dateLabel} />}>
        <CourierSection from={from} to={to} dateLabel={dateLabel} />
      </Suspense>
    </div>
  );
}

async function HeroBilled({ ordersPromise }: { ordersPromise: Promise<RetailOrderRow[]> }) {
  const orders = await ordersPromise;
  const billed = orders.reduce((s, o) => s + o.totalAmount, 0);
  return (
    <>
      <p className="text-3xl font-bold tabular-nums text-[#BFD732]">Rs {fmt(billed)}</p>
      <p className="text-xs text-gray-400 mt-0.5">{orders.length} orders</p>
    </>
  );
}

async function RetailSection({ ordersPromise }: { ordersPromise: Promise<RetailOrderRow[]> }) {
  const orders = await ordersPromise;

  // --- Metrics ---
  const total = orders.length;
  const billed = orders.reduce((s, o) => s + o.totalAmount, 0);
  const received = orders.reduce((s, o) => s + o.received, 0);
  const pending = Math.max(0, billed - received);
  const avgOrder = total ? billed / total : 0;

  const paid = orders.filter((o) => o.status === "PAID").length;
  const partial = orders.filter((o) => o.status === "PARTIAL").length;
  const unpaid = orders.filter((o) => o.status !== "PAID" && o.status !== "PARTIAL").length;
  const dispatched = orders.filter((o) => o.dispatched).length;
  const notDispatched = total - dispatched;

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

  if (total === 0) {
    return (
      <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center">
        <p className="text-3xl mb-3">📦</p>
        <p className="text-sm font-medium text-gray-500">No orders in this date range</p>
        <p className="text-xs text-gray-400 mt-1">Try a different date range</p>
      </div>
    );
  }

  return (
    <>
      {/* Row 1 — key numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BigStat label="Total Orders" value={String(total)} />
        <BigStat label="Fully Paid" value={String(paid)} sub={pct(paid, total)} />
        <BigStat label="Avg Order Value" value={`Rs ${fmt(avgOrder)}`} />
        <BigStat label="Recovery" value={pct(received, billed)} sub="received / billed" />
      </div>

      {/* Revenue strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <RevenueCard label="Total Billed" value={`Rs ${fmt(billed)}`} />
        <RevenueCard label="Received" value={`Rs ${fmt(received)}`} sub={`${paid} fully paid`} />
        <RevenueCard label="Pending Recovery" value={`Rs ${fmt(pending)}`} sub={`${partial + unpaid} unpaid / partial`} />
      </div>

      {/* Order & dispatch status */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Order & Dispatch Status</p>
          <span className="text-xs text-gray-400">{total} orders</span>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatusCard label="Paid" value={paid} sub={pct(paid, total)} dot="bg-[#BFD732]" />
          <StatusCard label="Partial" value={partial} sub={pct(partial, total)} dot="bg-amber-400" />
          <StatusCard label="Unpaid" value={unpaid} sub={pct(unpaid, total)} dot="bg-red-400" />
          <StatusCard label="Dispatched" value={dispatched} sub={pct(dispatched, total)} dot="bg-blue-400" />
          <StatusCard label="Not Dispatched" value={notDispatched} sub={pct(notDispatched, total)} dot="bg-gray-400" />
        </div>
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
            <span className="text-xs font-bold text-gray-900 tabular-nums">{total} orders · Rs {fmt(billed)}</span>
          </div>
        </div>
      )}
    </>
  );
}

async function CourierSection({ from, to, dateLabel }: { from: string; to: string; dateLabel: string }) {
  const courier = await fetchPostexStats(from, to, "retail");

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

function StatusCard({ label, value, sub, dot }: { label: string; value: number; sub?: string; dot?: string }) {
  return (
    <div className="rounded-xl p-4 border bg-gray-50/60 border-gray-100">
      <div className="flex items-center gap-1.5 mb-1.5">
        {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums leading-none text-[#16202E]">{value}</p>
      {sub && <p className="text-xs mt-1 font-medium text-gray-400">{sub}</p>}
    </div>
  );
}

function CourierCard({ label, value, sub, dot, highlight }: { label: string; value: number; sub?: string; dot?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? "bg-[#16202E] border-[#16202E]" : "bg-gray-50/60 border-gray-100"}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
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
