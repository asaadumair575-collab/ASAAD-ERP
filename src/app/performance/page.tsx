import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { logEmpPerformance, deleteEmpPerformance } from "@/lib/actions";
import Link from "next/link";

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

  const target = await prisma.performanceTarget.findFirst({ orderBy: { effectiveFrom: "desc" } });
  const users = isAdmin ? await prisma.user.findMany({ orderBy: { displayName: "asc" } }) : [];

  const pendingDelivery = await prisma.retailOrder.count({
    where: { dispatched: false, status: { notIn: ["CANCELLED", "DELIVERED"] } },
  });

  const filterUserId = isAdmin && user ? parseInt(user) : (!isAdmin ? me?.id : undefined);

  const entries = await prisma.empPerformance.findMany({
    where: {
      ...(filterUserId ? { userId: filterUserId } : {}),
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
    },
    include: { user: true },
    orderBy: { date: "desc" },
  });

  const totalCalls = entries.reduce((s, e) => s + e.calls, 0);
  const totalOrders = entries.reduce((s, e) => s + e.newOrders, 0);
  const days = entries.length;

  // Check today's entry for target warning
  const todayStr = new Date().toISOString().slice(0, 10);
  const myUserId = filterUserId ?? me?.id;
  const todayEntry = entries.find(e =>
    e.date.toISOString().slice(0, 10) === todayStr &&
    (!myUserId || e.userId === myUserId)
  );
  const showTargetWarning = target && todayEntry && todayEntry.newOrders < target.newOrders;

  const byUser = new Map<number, { name: string; calls: number; orders: number; days: number }>();
  for (const e of entries) {
    const existing = byUser.get(e.userId) ?? { name: e.user.displayName ?? e.user.username, calls: 0, orders: 0, days: 0 };
    byUser.set(e.userId, { ...existing, calls: existing.calls + e.calls, orders: existing.orders + e.newOrders, days: existing.days + 1 });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employee Performance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Daily calls aur new orders track karo</p>
        </div>
        {isAdmin && (
          <Link href="/performance/targets" className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
            Set Targets
          </Link>
        )}
      </div>

      {/* Target warning */}
      {showTargetWarning && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="text-red-500 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-700">Aaj ka target pura nahi hua!</p>
            <p className="text-xs text-red-500 mt-0.5">
              Aaj {todayEntry.newOrders} orders liye — target {target.newOrders} ka hai. {target.newOrders - todayEntry.newOrders} aur chahiye.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        {isAdmin && (
          <select name="user" defaultValue={user ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
            <option value="">All Employees</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.displayName ?? u.username}</option>)}
          </select>
        )}
        <input type="date" name="from" defaultValue={from ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        <span className="text-xs text-gray-400">to</span>
        <input type="date" name="to" defaultValue={to ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">Filter</button>
        {(from || to || user) && <Link href="/performance" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>}
      </form>

      {/* Log form */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Log Today's Performance</p>
        </div>
        <form action={logEmpPerformance} className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Date</label>
            <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          {isAdmin && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Employee</label>
              <select name="userId" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
                <option value="">Apna (self)</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.displayName ?? u.username}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Calls</label>
            <input name="calls" type="number" min="0" defaultValue="0" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">New Orders</label>
            <input name="newOrders" type="number" min="0" defaultValue="0" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div className={isAdmin ? "col-span-2 sm:col-span-4" : "col-span-2"}>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
            <input name="notes" type="text" placeholder="Optional" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div className={isAdmin ? "col-span-2 sm:col-span-4" : "col-span-2"}>
            <button type="submit" className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors">Log Performance</button>
          </div>
        </form>
      </div>

      {/* Pending delivery banner */}
      <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
        <span className="text-orange-400 text-lg">📦</span>
        <p className="text-sm text-orange-700">
          <span className="font-bold">{pendingDelivery}</span> orders abhi deliver hone baaki hain
        </p>
      </div>

      {/* Summary cards */}
      {days > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Calls", val: totalCalls, daily: Math.round(totalCalls / days), target: target?.calls ?? 0, color: "bg-blue-500" },
            { label: "New Orders", val: totalOrders, daily: Math.round(totalOrders / days), target: target?.newOrders ?? 0, color: "bg-purple-500" },
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
                : <p className="text-xs text-gray-400">Avg {"daily" in c ? c.daily : 0}/day · {days} days</p>
              }
              {"target" in c && (c.target ?? 0) > 0 && "daily" in c && <Bar value={c.daily as number} target={c.target as number} color={c.color} />}
              {"target" in c && (c.target ?? 0) > 0 && <p className="text-xs text-gray-400">Daily target: {c.target}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Per-user breakdown (admin) */}
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

      {/* Daily log */}
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
                  <th className="py-2 px-4">Notes</th>
                  {isAdmin && <th className="py-2 px-4" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => {
                  const conv = e.calls > 0 ? Math.round((e.newOrders / e.calls) * 100) : 0;
                  const orderPct = pct(e.newOrders, target?.newOrders ?? 0);
                  const isToday = e.date.toISOString().slice(0, 10) === todayStr;
                  return (
                    <tr key={e.id} className={`hover:bg-gray-50/70 ${isToday && target && e.newOrders < target.newOrders ? "bg-red-50/40" : ""}`}>
                      <td className="py-3 px-4 text-gray-600 text-xs">{e.date.toISOString().slice(0, 10)}</td>
                      {isAdmin && <td className="py-3 px-4 font-medium">{e.user.displayName ?? e.user.username}</td>}
                      <td className="py-3 px-4 text-right font-semibold text-blue-600 tabular-nums">{e.calls}</td>
                      <td className="py-3 px-4 text-right font-semibold text-purple-600 tabular-nums">{e.newOrders}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600 tabular-nums">{conv}%</td>
                      {target && (
                        <td className="py-3 px-4 text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${orderPct >= 100 ? "bg-green-100 text-green-700" : orderPct >= 70 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                            {orderPct}%
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-4 text-xs text-gray-400">{e.notes ?? "—"}</td>
                      {isAdmin && (
                        <td className="py-3 px-4">
                          <form action={deleteEmpPerformance.bind(null, e.id)}>
                            <button type="submit" className="text-xs text-red-400 hover:text-red-600">Delete</button>
                          </form>
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
          <p className="text-gray-400 text-sm">Koi entry nahi — upar se log karo</p>
        </div>
      )}
    </div>
  );
}
