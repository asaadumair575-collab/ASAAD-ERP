import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { pkDayStart, pkDayEnd, todayPK } from "@/lib/tz";
import { userLabel } from "@/lib/userLabel";

const STATUS_LABEL: Record<string, string> = {
  PENDING:           "Pending",
  ASSIGNED:          "Assigned",
  FOLLOW_UP:         "Follow-up",
  NO_ANSWER_RETRY:   "No-answer Retry",
  UNREACHABLE:       "Unreachable",
  DONE:              "Done",
};

const SOURCE_LABEL: Record<string, string> = {
  RETAIL_ADVANCE: "Retail Advance",
  COD:            "COD",
  REORDER:        "Reorder",
  SHOPIFY:        "Shopify",
  MANUAL:         "Manual",
};

export default async function CallingDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/calling/queue");

  const { date } = await searchParams;
  const todayStr = todayPK();
  const selectedDate = date || todayStr;
  const dayStart = pkDayStart(selectedDate);
  const dayEnd   = pkDayEnd(selectedDate);

  // Today's call records
  const records = await prisma.callingRecord.findMany({
    where: { calledAt: { gte: dayStart, lte: dayEnd } },
    include: {
      calledBy: { select: { id: true, displayName: true, username: true, isAdmin: true } },
      lead:     { select: { sourceType: true } },
    },
    orderBy: { calledAt: "asc" },
  });

  // Queue snapshot
  const [queueCounts, followupPending] = await Promise.all([
    prisma.callingLead.groupBy({
      by: ["queueStatus"],
      _count: { id: true },
    }),
    prisma.callingLead.count({ where: { queueStatus: "FOLLOW_UP" } }),
  ]);

  const queueMap = Object.fromEntries(queueCounts.map((r) => [r.queueStatus, r._count.id]));

  // Summary stats for today
  const totalCalls    = records.length;
  const noAnswerCount = records.filter((r) => r.status === "NO_ANSWER" || r.status === "BUSY").length;
  const connected     = records.filter((r) => r.status !== "NO_ANSWER" && r.status !== "BUSY").length;
  const orders        = records.filter((r) => r.status === "ORDER_CONFIRMED").length;
  const conversionRate = connected > 0 ? Math.round((orders / connected) * 100) : 0;

  // Per-employee stats
  type EmpRow = { id: number; label: string; total: number; connected: number; orders: number; noAnswer: number; interested: number; followup: number };
  const empMap = new Map<number, EmpRow>();
  for (const r of records) {
    const id = r.calledBy.id;
    if (!empMap.has(id)) empMap.set(id, { id, label: userLabel(r.calledBy), total: 0, connected: 0, orders: 0, noAnswer: 0, interested: 0, followup: 0 });
    const row = empMap.get(id)!;
    row.total++;
    if (r.status === "NO_ANSWER" || r.status === "BUSY") row.noAnswer++;
    else {
      row.connected++;
      if (r.status === "ORDER_CONFIRMED") row.orders++;
      else if (r.status === "INTERESTED") row.interested++;
      else if (r.status === "FOLLOW_UP_REQUIRED") row.followup++;
    }
  }
  const empRows = Array.from(empMap.values()).sort((a, b) => b.total - a.total);

  // Per-source stats
  const sourceMap = new Map<string, { total: number; orders: number }>();
  for (const r of records) {
    const src = r.lead.sourceType;
    const s = sourceMap.get(src) ?? { total: 0, orders: 0 };
    s.total++;
    if (r.status === "ORDER_CONFIRMED") s.orders++;
    sourceMap.set(src, s);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calling Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Automated call queue — manager view</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/calling/settings" className="text-xs border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 text-gray-600">
            ⚙ Settings
          </Link>
          <form method="GET" className="flex items-center gap-2">
            <input type="date" name="date" defaultValue={selectedDate} max={todayStr}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-black" />
            <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800">Go</button>
          </form>
        </div>
      </div>

      {/* Queue snapshot */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Queue Snapshot</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(STATUS_LABEL).map(([k, label]) => (
            <div key={k} className="text-center bg-gray-50 rounded-xl px-4 py-3 min-w-[80px]">
              <p className="text-xl font-bold text-gray-800">{queueMap[k] ?? 0}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Today's stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Calls",      value: totalCalls,    color: "text-gray-700" },
          { label: "Connected",         value: connected,     color: "text-blue-600" },
          { label: "No Answer / Busy",  value: noAnswerCount, color: "text-yellow-600" },
          { label: "Orders",            value: orders,        color: "text-green-600" },
          { label: "Conversion Rate",   value: `${conversionRate}%`, color: "text-violet-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Follow-ups pending */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-2xl font-bold text-amber-600">{followupPending}</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">Follow-ups Pending</p>
          <p className="text-xs text-amber-600">Customers waiting to be called back</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-4xl mb-3">📞</p>
          <p className="text-sm font-medium text-gray-500">Is din koi call nahi hui</p>
        </div>
      ) : (
        <>
          {/* Per-employee */}
          {empRows.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Employee Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                      <th className="pb-2 text-left">Employee</th>
                      <th className="pb-2 text-right">Total</th>
                      <th className="pb-2 text-right">Connected</th>
                      <th className="pb-2 text-right">No Ans</th>
                      <th className="pb-2 text-right">Interested</th>
                      <th className="pb-2 text-right">Follow-up</th>
                      <th className="pb-2 text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {empRows.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50/60">
                        <td className="py-2.5 pr-4 font-medium text-gray-800">{e.label}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-700">{e.total}</td>
                        <td className="py-2.5 text-right text-blue-600">{e.connected}</td>
                        <td className="py-2.5 text-right text-yellow-600">{e.noAnswer}</td>
                        <td className="py-2.5 text-right text-violet-600">{e.interested}</td>
                        <td className="py-2.5 text-right text-blue-500">{e.followup}</td>
                        <td className="py-2.5 text-right text-green-600 font-bold">{e.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Per-source */}
          {sourceMap.size > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Lead Source Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                      <th className="pb-2 text-left">Source</th>
                      <th className="pb-2 text-right">Calls</th>
                      <th className="pb-2 text-right">Orders</th>
                      <th className="pb-2 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Array.from(sourceMap.entries()).sort((a, b) => b[1].total - a[1].total).map(([src, s]) => (
                      <tr key={src} className="hover:bg-gray-50/60">
                        <td className="py-2.5 pr-4 font-medium text-gray-800">{SOURCE_LABEL[src] ?? src}</td>
                        <td className="py-2.5 text-right text-gray-700">{s.total}</td>
                        <td className="py-2.5 text-right text-green-600 font-bold">{s.orders}</td>
                        <td className="py-2.5 text-right text-violet-600">
                          {s.total > 0 ? `${Math.round((s.orders / s.total) * 100)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
