import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import DateRangeFilter from "@/components/DateRangeFilter";
import { userLabel } from "@/lib/userLabel";

function pct(val: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((val / target) * 100));
}

function Bar({ value, target, color }: { value: number; target: number; color: string }) {
  const p = pct(value, target);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500 w-10 text-right">{p}%</span>
    </div>
  );
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; user?: string }>;
}) {
  const { from, to, user } = await searchParams;
  const me = await getSessionUser();
  const isAdmin = me?.isAdmin ?? false;

  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;

  // Use the target that was in effect on the selected date (or latest if no filter)
  const targetLookupDate = fromDate ?? toDate ?? new Date();
  const target = await prisma.performanceTarget.findFirst({
    where: { effectiveFrom: { lte: targetLookupDate } },
    orderBy: { effectiveFrom: "desc" },
  });
  const users = isAdmin ? await prisma.user.findMany({ where: { isAdmin: false }, orderBy: { displayName: "asc" } }) : [];

  const pendingDelivery = await prisma.retailOrder.count({
    where: { dispatched: false, status: { notIn: ["CANCELLED", "DELIVERED"] } },
  });

  const filterUserId = isAdmin && user ? parseInt(user) : (!isAdmin ? me?.id : undefined);

  // Calls: from ReorderLead
  const reorderLeads = await prisma.reorderLead.findMany({
    where: {
      calledAt: { not: null, ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) },
      ...(filterUserId ? { calledById: filterUserId } : {}),
    },
    select: {
      calledAt: true,
      calledById: true,
      calledBy: { select: { id: true, displayName: true, username: true, isAdmin: true } },
    },
  });

  // Orders: from RetailOrder
  const retailOrders = await prisma.retailOrder.findMany({
    where: {
      createdByUserId: { not: null },
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...(filterUserId ? { createdByUserId: filterUserId } : {}),
    },
    select: {
      date: true,
      createdByUserId: true,
      createdBy: { select: { id: true, displayName: true, username: true, isAdmin: true } },
    },
  });

  // Aggregate by date + userId
  type DayKey = string; // "YYYY-MM-DD|userId"
  const dayMap = new Map<DayKey, { date: string; userId: number; name: string; calls: number; orders: number }>();

  function dayKey(dateStr: string, uid: number) { return `${dateStr}|${uid}`; }

  for (const l of reorderLeads) {
    if (!l.calledAt || !l.calledById || !l.calledBy) continue;
    const dateStr = l.calledAt.toISOString().slice(0, 10);
    const uid = l.calledById;
    const key = dayKey(dateStr, uid);
    const existing = dayMap.get(key) ?? { date: dateStr, userId: uid, name: userLabel(l.calledBy), calls: 0, orders: 0 };
    existing.calls++;
    dayMap.set(key, existing);
  }

  for (const o of retailOrders) {
    if (!o.createdByUserId || !o.createdBy) continue;
    const dateStr = o.date.toISOString().slice(0, 10);
    const uid = o.createdByUserId;
    const key = dayKey(dateStr, uid);
    const existing = dayMap.get(key) ?? { date: dateStr, userId: uid, name: userLabel(o.createdBy), calls: 0, orders: 0 };
    existing.orders++;
    dayMap.set(key, existing);
  }

  const entries = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));

  const totalCalls = entries.reduce((s, e) => s + e.calls, 0);
  const totalOrders = entries.reduce((s, e) => s + e.orders, 0);
  // Count unique days (not rows) for avg calc
  const uniqueDays = new Set(entries.map(e => e.date)).size;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  // Today's stats for the current user
  const myUserId = filterUserId ?? me?.id;
  const todayEntries = entries.filter(e => e.date === todayStr && (!myUserId || e.userId === myUserId));
  const todayCallsCount = todayEntries.reduce((s, e) => s + e.calls, 0);
  const todayOrdersCount = todayEntries.reduce((s, e) => s + e.orders, 0);

  const scoreCallsPct = target?.calls && uniqueDays > 0 ? Math.min(100, Math.round((totalCalls / uniqueDays / target.calls) * 100)) : null;
  const scoreOrdersPct = target?.newOrders && uniqueDays > 0 ? Math.min(100, Math.round((totalOrders / uniqueDays / target.newOrders) * 100)) : null;
  const overallScore = scoreCallsPct !== null && scoreOrdersPct !== null
    ? Math.round((scoreCallsPct + scoreOrdersPct) / 2)
    : null;

  // Per-user breakdown
  const byUser = new Map<number, { name: string; calls: number; orders: number; days: number }>();
  for (const e of entries) {
    const existing = byUser.get(e.userId) ?? { name: e.name, calls: 0, orders: 0, days: 0 };
    byUser.set(e.userId, { ...existing, calls: existing.calls + e.calls, orders: existing.orders + e.orders, days: existing.days + 1 });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employee Performance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Calls from reorder module · Orders from retail advance</p>
        </div>
        {isAdmin && (
          <Link href="/performance/targets"
            className="border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shrink-0">
            Set Targets
          </Link>
        )}
      </div>

      {/* Daily target card */}
      {target && (
        <div className={`bg-white border-2 rounded-2xl shadow-sm p-5 ${
          todayCallsCount >= target.calls && todayOrdersCount >= target.newOrders
            ? "border-green-300"
            : (todayCallsCount > 0 || todayOrdersCount > 0) ? "border-amber-300" : "border-gray-200"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">Today&apos;s Target</p>
            {(todayCallsCount > 0 || todayOrdersCount > 0)
              ? (todayCallsCount >= target.calls && todayOrdersCount >= target.newOrders
                  ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">✅ Target Achieved!</span>
                  : <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">⏳ In Progress</span>)
              : <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">No activity today</span>
            }
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-end justify-between mb-1.5">
                <p className="text-xs text-gray-500">Calls</p>
                <p className="text-xs font-medium text-gray-600">
                  <span className={`text-lg font-bold ${todayCallsCount >= target.calls ? "text-green-600" : "text-gray-900"}`}>
                    {todayCallsCount}
                  </span>
                  <span className="text-gray-400"> / {target.calls}</span>
                </p>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${todayCallsCount >= target.calls ? "bg-green-500" : "bg-blue-500"}`}
                  style={{ width: `${target.calls ? Math.min(100, Math.round((todayCallsCount / target.calls) * 100)) : 0}%` }}
                />
              </div>
              {todayCallsCount < target.calls && (
                <p className="text-xs text-amber-600 mt-1">{target.calls - todayCallsCount} more calls remaining</p>
              )}
            </div>
            <div>
              <div className="flex items-end justify-between mb-1.5">
                <p className="text-xs text-gray-500">New Orders</p>
                <p className="text-xs font-medium text-gray-600">
                  <span className={`text-lg font-bold ${todayOrdersCount >= target.newOrders ? "text-green-600" : "text-gray-900"}`}>
                    {todayOrdersCount}
                  </span>
                  <span className="text-gray-400"> / {target.newOrders}</span>
                </p>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${todayOrdersCount >= target.newOrders ? "bg-green-500" : "bg-purple-500"}`}
                  style={{ width: `${target.newOrders ? Math.min(100, Math.round((todayOrdersCount / target.newOrders) * 100)) : 0}%` }}
                />
              </div>
              {todayOrdersCount < target.newOrders && (
                <p className="text-xs text-amber-600 mt-1">{target.newOrders - todayOrdersCount} more orders remaining</p>
              )}
            </div>
          </div>
        </div>
      )}

      {pendingDelivery > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <span className="text-orange-400 text-lg">📦</span>
          <p className="text-sm text-orange-700">
            <span className="font-bold">{pendingDelivery}</span> retail orders pending delivery
          </p>
        </div>
      )}

      {overallScore !== null && (
        <div className={`bg-white border rounded-2xl shadow-sm p-5 flex items-center gap-6 ${overallScore >= 80 ? "border-green-200" : overallScore >= 50 ? "border-yellow-200" : "border-red-200"}`}>
          <div className="shrink-0 relative w-20 h-20">
            <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="8" />
              <circle cx="40" cy="40" r="34" fill="none"
                stroke={overallScore >= 80 ? "#22c55e" : overallScore >= 50 ? "#eab308" : "#ef4444"}
                strokeWidth="8"
                strokeDasharray={`${(overallScore / 100) * 213.6} 213.6`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold ${overallScore >= 80 ? "text-green-600" : overallScore >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                {overallScore}
              </span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {overallScore >= 80 ? "On Track" : overallScore >= 50 ? "Needs Improvement" : "Behind Target"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Score based on avg daily performance vs targets</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 shrink-0">Calls</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${scoreCallsPct}%` }} />
                </div>
                <span className="text-xs font-semibold text-blue-600 w-10 text-right">{scoreCallsPct}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 shrink-0">Orders</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${scoreOrdersPct}%` }} />
                </div>
                <span className="text-xs font-semibold text-purple-600 w-10 text-right">{scoreOrdersPct}%</span>
              </div>
            </div>
            {overallScore < 100 && (
              <p className="text-xs text-gray-400">
                {(scoreOrdersPct ?? 0) < (scoreCallsPct ?? 0) ? "Orders are lagging behind" : "Calls are lagging behind"}
                {" — "}target: {target!.calls} calls / {target!.newOrders} orders per day
              </p>
            )}
          </div>
        </div>
      )}

      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        {isAdmin && (
          <select name="user" defaultValue={user ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
            <option value="">All Employees</option>
            {users.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
          </select>
        )}
        <DateRangeFilter from={from} to={to} />
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">Filter</button>
        {(from || to || user) && <Link href="/performance" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>}
      </form>

      {uniqueDays > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Calls", val: totalCalls, daily: Math.round(totalCalls / uniqueDays), target: target?.calls ?? 0, color: "bg-blue-500" },
            { label: "New Orders", val: totalOrders, daily: Math.round(totalOrders / uniqueDays), target: target?.newOrders ?? 0, color: "bg-purple-500" },
            {
              label: "Conversion Rate",
              val: totalCalls > 0 ? Math.round((totalOrders / totalCalls) * 100) : 0,
              suffix: "%",
              sub: `${totalOrders} orders / ${totalCalls} calls`,
              color: "bg-green-500",
            },
          ].map((c) => (
            <div key={c.label} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{c.label}</p>
              <p className="text-2xl font-bold tracking-tight">{c.val}{"suffix" in c ? c.suffix : ""}</p>
              {"sub" in c
                ? <p className="text-xs text-gray-400">{c.sub}</p>
                : <p className="text-xs text-gray-400">Avg {"daily" in c ? c.daily : 0}/day · {uniqueDays} days</p>
              }
              {"target" in c && (c.target ?? 0) > 0 && "daily" in c && <Bar value={c.daily as number} target={c.target as number} color={c.color} />}
              {"target" in c && (c.target ?? 0) > 0 && <p className="text-xs text-gray-400">Daily target: {c.target}</p>}
            </div>
          ))}
        </div>
      )}

      {isAdmin && !filterUserId && byUser.size > 1 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Employee Breakdown</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="py-2 px-4">Employee</th>
                  <th className="py-2 px-4 text-right">Days</th>
                  <th className="py-2 px-4 text-right">Calls</th>
                  <th className="py-2 px-4 text-right">Orders</th>
                  <th className="py-2 px-4 text-right">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Array.from(byUser.values()).sort((a, b) => b.orders - a.orders).map((u) => {
                  const conv = u.calls > 0 ? Math.round((u.orders / u.calls) * 100) : 0;
                  return (
                    <tr key={u.name} className="hover:bg-gray-50/70">
                      <td className="py-3 px-4 font-medium">{u.name}</td>
                      <td className="py-3 px-4 text-right text-gray-500">{u.days}</td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-600">{u.calls}</td>
                      <td className="py-3 px-4 text-right font-semibold text-purple-600">{u.orders}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600">{conv}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Daily Log</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="py-2 px-4">Date</th>
                  {isAdmin && <th className="py-2 px-4">Employee</th>}
                  <th className="py-2 px-4 text-right">Calls</th>
                  <th className="py-2 px-4 text-right">Orders</th>
                  <th className="py-2 px-4 text-right">Conversion</th>
                  {target && <th className="py-2 px-4 text-right">Target %</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => {
                  const conv = e.calls > 0 ? Math.round((e.orders / e.calls) * 100) : 0;
                  const orderPct = pct(e.orders, target?.newOrders ?? 0);
                  const isToday = e.date === todayStr;
                  return (
                    <tr key={`${e.date}-${e.userId}`} className={`hover:bg-gray-50/70 ${isToday && target && e.orders < target.newOrders ? "bg-red-50/40" : ""}`}>
                      <td className="py-3 px-4 text-gray-600 text-xs">{e.date}</td>
                      {isAdmin && <td className="py-3 px-4 font-medium">{e.name}</td>}
                      <td className="py-3 px-4 text-right font-semibold text-blue-600 tabular-nums">{e.calls}</td>
                      <td className="py-3 px-4 text-right font-semibold text-purple-600 tabular-nums">{e.orders}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600 tabular-nums">{conv}%</td>
                      {target && (
                        <td className="py-3 px-4 text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${orderPct >= 100 ? "bg-green-100 text-green-700" : orderPct >= 70 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                            {orderPct}%
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No activity in this period</p>
          <p className="text-xs text-gray-300 mt-1">Calls from reorder module and retail orders will appear here automatically</p>
        </div>
      )}
    </div>
  );
}
