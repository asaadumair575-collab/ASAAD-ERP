import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { userLabel } from "@/lib/userLabel";
import { todayPK, pkDayStart, pkDayEnd, toLocalHour } from "@/lib/tz";

export default async function ReorderDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; emp?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { date, emp } = await searchParams;

  const todayStr = todayPK();
  const selectedDate = date || todayStr;
  const selectedEmpId = emp ? parseInt(emp, 10) : null;

  const dayStart = pkDayStart(selectedDate);
  const dayEnd   = pkDayEnd(selectedDate);

  // All call logs for selected date (optionally filtered by employee)
  const logs = await prisma.reorderCallLog.findMany({
    where: {
      calledAt: { gte: dayStart, lte: dayEnd },
      ...(selectedEmpId ? { calledById: selectedEmpId } : {}),
    },
    include: {
      calledBy: { select: { id: true, displayName: true, username: true, isAdmin: true } },
      lead: { select: { id: true, phone: true, customerName: true } },
    },
    orderBy: { calledAt: "asc" },
  });

  // All employees who have ever made a reorder call (for dropdown)
  const allEmployees = await prisma.user.findMany({
    where: { reorderCallLogs: { some: {} } },
    select: { id: true, displayName: true, username: true, isAdmin: true },
    orderBy: { displayName: "asc" },
  });

  // Summary stats
  const total            = logs.length;
  const noAnswer         = logs.filter((l) => l.status === "NO_ANSWER").length;
  const interested       = logs.filter((l) => l.status === "ORDER_PLACED").length;
  const interestedLater  = logs.filter((l) => l.status === "INTERESTED_LATER").length;
  const ordered          = logs.filter((l) => l.status === "ORDER_RECEIVED").length;

  // Hourly distribution (0-23)
  const hourCounts = Array(24).fill(0) as number[];
  for (const l of logs) {
    hourCounts[toLocalHour(new Date(l.calledAt))]++;
  }
  // Only show working hours (9am–6pm)
  const HOUR_START = 9;
  const HOUR_END   = 18; // exclusive, so last bar is 5pm–6pm
  const visibleHourCounts = hourCounts.slice(HOUR_START, HOUR_END);
  const maxHour = Math.max(...visibleHourCounts, 1);

  // Per-employee breakdown
  // Track which leads each employee called (for "new calls" = unique leads)
  const empLeadSets = new Map<number, Set<number>>();

  type EmpRow = { id: number; label: string; total: number; newCalls: number; noAnswer: number; interested: number; interestedLater: number; ordered: number };
  const empMap = new Map<number, EmpRow>();
  for (const l of logs) {
    const id = l.calledBy.id;
    if (!empMap.has(id)) {
      empMap.set(id, { id, label: userLabel(l.calledBy), total: 0, newCalls: 0, noAnswer: 0, interested: 0, interestedLater: 0, ordered: 0 });
      empLeadSets.set(id, new Set());
    }
    const row = empMap.get(id)!;
    const leadSet = empLeadSets.get(id)!;
    row.total++;
    if (!leadSet.has(l.leadId)) {
      leadSet.add(l.leadId);
      row.newCalls++;
    }
    if (l.status === "NO_ANSWER")             row.noAnswer++;
    else if (l.status === "ORDER_RECEIVED")   row.ordered++;
    else if (l.status === "ORDER_PLACED")     row.interested++;
    else if (l.status === "INTERESTED_LATER") row.interestedLater++;
  }
  const empRows = Array.from(empMap.values()).sort((a, b) => b.total - a.total);

  const fmt = (h: number) => {
    const h12 = h % 12 || 12;
    const suffix = h < 12 ? "am" : "pm";
    return `${h12}${suffix}`;
  };
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${fmt(i)}–${fmt(i + 1)}`);
  const visibleHourLabels = hourLabels.slice(HOUR_START, HOUR_END);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/reorder" className="text-sm text-gray-400 hover:text-gray-600">← Campaigns</Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Reorder Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Call log & verification</p>
        </div>

        {/* Filters */}
        <form method="GET" className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            max={todayStr}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
          <select
            name="emp"
            defaultValue={selectedEmpId ?? ""}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">All Employees</option>
            {allEmployees.map((e) => (
              <option key={e.id} value={e.id}>{userLabel(e)}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go
          </button>
        </form>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Calls",        value: total,           color: "text-gray-700" },
          { label: "Not Answered",       value: noAnswer,        color: "text-yellow-600" },
          { label: "Interested",         value: interested,      color: "text-violet-600" },
          { label: "Interested — Later", value: interestedLater, color: "text-orange-500" },
          { label: "Orders",             value: ordered,         color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-4xl mb-3">📞</p>
          <p className="text-sm font-medium text-gray-500">Is din koi call nahi ki</p>
        </div>
      ) : (
        <>
          {/* Hourly bar chart */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Calls Per Hour</h2>
            <div className="flex items-end gap-[3px] h-32">
              {visibleHourCounts.map((count, i) => (
                <div
                  key={i}
                  className="flex-1 relative group"
                  style={{ height: "100%", display: "flex", alignItems: "flex-end" }}
                  title={`${visibleHourLabels[i]}: ${count} call${count !== 1 ? "s" : ""}`}
                >
                  <div
                    className={`w-full rounded-t transition-all ${count > 0 ? "bg-zinc-800 hover:bg-zinc-600" : "bg-gray-100"}`}
                    style={{ height: count > 0 ? `${Math.max(6, (count / maxHour) * 100)}%` : "4px" }}
                  />
                  {count > 0 && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] text-gray-600 font-semibold bg-white border border-gray-200 rounded px-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {count}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Rotated labels */}
            <div className="flex gap-[3px] mt-1 overflow-hidden" style={{ height: "48px" }}>
              {visibleHourLabels.map((label, i) => (
                <div key={i} className="flex-1 flex items-start justify-center overflow-hidden">
                  <span
                    className="text-[10px] text-gray-400 whitespace-nowrap font-medium"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", lineHeight: 1 }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-employee call count card */}
          {empRows.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Calls Per Employee</h2>
              <div className="space-y-4">
                {empRows.map((e) => {
                  const totalPct  = Math.round((e.total    / total) * 100);
                  const newPct    = Math.round((e.newCalls / total) * 100);
                  return (
                    <div key={e.id} className="space-y-2">
                      <p className="text-sm font-semibold text-gray-800">{e.label}</p>
                      {/* New calls bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-400">New Calls (unique leads)</span>
                          <span className="font-bold text-blue-600 tabular-nums">{e.newCalls}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${newPct}%` }} />
                        </div>
                      </div>
                      {/* Repeat calls bar */}
                      {e.total - e.newCalls > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-400">Repeat Calls</span>
                            <span className="font-bold text-orange-500 tabular-nums">{e.total - e.newCalls}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${totalPct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* Per-employee breakdown */}
          {empRows.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Per Employee</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                      <th className="pb-2 text-left">Employee</th>
                      <th className="pb-2 text-right">Total</th>
                      <th className="pb-2 text-right">Not Answered</th>
                      <th className="pb-2 text-right">Interested</th>
                      <th className="pb-2 text-right">Int. Later</th>
                      <th className="pb-2 text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {empRows.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50/60">
                        <td className="py-2.5 pr-4 font-medium text-gray-800">{e.label}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-700">{e.total}</td>
                        <td className="py-2.5 text-right text-yellow-600">{e.noAnswer}</td>
                        <td className="py-2.5 text-right text-violet-600">{e.interested}</td>
                        <td className="py-2.5 text-right text-orange-500">{e.interestedLater}</td>
                        <td className="py-2.5 text-right text-green-600">{e.ordered}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Full call log — for admin verification */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Call Log
              <span className="ml-2 text-xs font-normal text-gray-400">verify karne ke liye</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-2 text-left">Time</th>
                    <th className="pb-2 text-left">Employee</th>
                    <th className="pb-2 text-left">Customer</th>
                    <th className="pb-2 text-left">Phone</th>
                    <th className="pb-2 text-left">Status</th>
                    <th className="pb-2 text-left">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((l) => {
                    const d = new Date(l.calledAt);
                    const timeStr = d.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: true });
                    return (
                      <tr key={l.id} className="hover:bg-gray-50/60">
                        <td className="py-2 pr-4 text-xs text-gray-400 whitespace-nowrap tabular-nums">{timeStr}</td>
                        <td className="py-2 pr-4 font-medium text-gray-800 whitespace-nowrap">{userLabel(l.calledBy)}</td>
                        <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{l.lead.customerName || "—"}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          <a
                            href={`tel:${l.lead.phone}`}
                            className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {l.lead.phone}
                          </a>
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          <StatusBadge status={l.status} />
                        </td>
                        <td className="py-2 text-xs text-gray-400 max-w-[200px] truncate">{l.callNote || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    NO_ANSWER:      { label: "No Answer",  color: "bg-yellow-100 text-yellow-700" },
    ORDER_PLACED:   { label: "Interested", color: "bg-violet-100 text-violet-700" },
    ORDER_RECEIVED: { label: "Ordered",    color: "bg-green-100 text-green-700" },
    NOT_INTERESTED: { label: "Nahi Karna", color: "bg-red-100 text-red-600" },
    CALLBACK:       { label: "Follow-up",  color: "bg-blue-100 text-blue-700" },
  };
  const s = map[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}
