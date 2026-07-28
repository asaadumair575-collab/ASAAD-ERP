import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { logEmpPerformance } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import PerformanceRowActions from "./PerformanceRowActions";

export default async function PerformanceLogPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  const isAdmin = me.isAdmin ?? false;

  const users = isAdmin ? await prisma.user.findMany({ orderBy: { displayName: "asc" } }) : [];

  const entries = await prisma.empPerformance.findMany({
    ...(isAdmin ? {} : { where: { userId: me.id } }),
    include: { user: true },
    orderBy: { date: "desc" },
    take: 30,
  });

  const target = await prisma.performanceTarget.findFirst({ orderBy: { effectiveFrom: "desc" } });
  const todayStr = new Date().toISOString().slice(0, 10);

  function pct(val: number, t: number) {
    if (!t) return 0;
    return Math.min(100, Math.round((val / t) * 100));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/performance" className="text-gray-400 hover:text-black text-sm">← Back</Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Log Performance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add a daily calls and orders entry</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden max-w-xl">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">New Entry</p>
        </div>
        <form action={logEmpPerformance} className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Date</label>
            <input name="date" type="date" defaultValue={todayStr} required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          {isAdmin && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Employee</label>
              <select name="userId" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
                <option value="">Self</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.displayName ?? u.username}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Calls</label>
            <input name="calls" type="number" min="0" defaultValue="0"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">New Orders</label>
            <input name="newOrders" type="number" min="0" defaultValue="0"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
            <input name="notes" type="text" placeholder="Optional"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div className="col-span-2">
            <button type="submit"
              className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
              Save Entry
            </button>
          </div>
        </form>
      </div>

      {entries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden max-w-xl">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent Entries</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="py-2 px-4">Date</th>
                  {isAdmin && <th className="py-2 px-4">Employee</th>}
                  <th className="py-2 px-4 text-right">Calls</th>
                  <th className="py-2 px-4 text-right">Orders</th>
                  {target && <th className="py-2 px-4 text-right">Target %</th>}
                  <th className="py-2 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => {
                  const orderPct = pct(e.newOrders, target?.newOrders ?? 0);
                  const isToday = e.date.toISOString().slice(0, 10) === todayStr;
                  return (
                    <tr key={e.id} className={`hover:bg-gray-50/70 ${isToday ? "bg-blue-50/30" : ""}`}>
                      <td className="py-3 px-4 text-gray-600 text-xs">{e.date.toISOString().slice(0, 10)}</td>
                      {isAdmin && <td className="py-3 px-4 font-medium">{e.user.displayName ?? e.user.username}</td>}
                      <td className="py-3 px-4 text-right font-semibold text-blue-600 tabular-nums">{e.calls}</td>
                      <td className="py-3 px-4 text-right font-semibold text-purple-600 tabular-nums">{e.newOrders}</td>
                      {target && (
                        <td className="py-3 px-4 text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${orderPct >= 100 ? "bg-green-100 text-green-700" : orderPct >= 70 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                            {orderPct}%
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <PerformanceRowActions
                          id={e.id}
                          calls={e.calls}
                          newOrders={e.newOrders}
                          notes={e.notes}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
