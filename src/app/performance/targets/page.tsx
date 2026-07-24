import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { savePerformanceTarget } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PerformanceTargetsPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/performance");

  const targets = await prisma.performanceTarget.findMany({ orderBy: { effectiveFrom: "desc" }, take: 10 });
  const latest = targets[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/performance" className="text-gray-400 hover:text-black text-sm">← Back</Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Set Performance Targets</h1>
          <p className="text-sm text-gray-500 mt-0.5">Daily targets for calls, confirmations, and new orders</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden max-w-lg">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">New Target</p>
        </div>
        <form action={savePerformanceTarget} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Daily Calls Target</label>
            <input name="calls" type="number" min="0" defaultValue={latest?.calls ?? 50} required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Daily Confirmations Target</label>
            <input name="confirmations" type="number" min="0" defaultValue={latest?.confirmations ?? 10} required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Daily New Orders Target</label>
            <input name="newOrders" type="number" min="0" defaultValue={latest?.newOrders ?? 5} required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <button type="submit" className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
            Save Target
          </button>
        </form>
      </div>

      {targets.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden max-w-lg">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Target History</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="py-2 px-4">Effective From</th>
                <th className="py-2 px-4 text-right">Calls</th>
                <th className="py-2 px-4 text-right">Confirmations</th>
                <th className="py-2 px-4 text-right">New Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {targets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/70">
                  <td className="py-3 px-4 text-gray-600 text-xs">{t.effectiveFrom.toISOString().slice(0, 10)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-blue-600">{t.calls}</td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600">{t.confirmations}</td>
                  <td className="py-3 px-4 text-right font-semibold text-purple-600">{t.newOrders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
