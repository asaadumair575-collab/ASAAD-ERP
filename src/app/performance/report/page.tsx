import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { pkDayStart, pkDayEnd, toLocalDateStr, todayPK } from "@/lib/tz";
import { userLabel } from "@/lib/userLabel";
import ReportForm from "./ReportForm";
import PrintButton from "./PrintButton";
import Link from "next/link";

function grade(pct: number | null): { label: string; color: string; bg: string } {
  if (pct === null) return { label: "N/A", color: "text-gray-400", bg: "bg-gray-50" };
  if (pct >= 100) return { label: "A", color: "text-green-700", bg: "bg-green-50" };
  if (pct >= 80)  return { label: "B", color: "text-blue-700",  bg: "bg-blue-50" };
  if (pct >= 60)  return { label: "C", color: "text-amber-700", bg: "bg-amber-50" };
  if (pct >= 40)  return { label: "D", color: "text-orange-700",bg: "bg-orange-50" };
  return             { label: "F", color: "text-red-700",   bg: "bg-red-50" };
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const me = await getSessionUser();
  if (!me?.isAdmin) notFound();

  const sp = await searchParams;
  const todayStr = todayPK();

  // Default: last 7 days
  const defaultTo = todayStr;
  const defaultFrom = (() => {
    const d = new Date(todayStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 6);
    return d.toISOString().slice(0, 10);
  })();

  const fromStr = sp.from ?? "";
  const toStr   = sp.to ?? "";
  const hasRange = fromStr && toStr;

  const fromDate = hasRange ? pkDayStart(fromStr) : null;
  const toDate   = hasRange ? pkDayEnd(toStr)     : null;

  // Fetch data only when range is selected
  let reportData: {
    userId: number;
    name: string;
    calls: number;
    orders: number;
    activeDays: number;
    avgCalls: number;
    avgOrders: number;
    callsPct: number | null;
    ordersPct: number | null;
    overallPct: number | null;
    dailyBreakdown: { date: string; calls: number; orders: number }[];
  }[] = [];

  let targetCalls = 0;
  let targetOrders = 0;
  let totalDays = 0;

  if (hasRange && fromDate && toDate) {
    // Days in range
    const msPerDay = 24 * 60 * 60 * 1000;
    totalDays = Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay) + 1;

    // Target effective at end of range
    const target = await prisma.performanceTarget.findFirst({
      where: { effectiveFrom: { lte: toDate } },
      orderBy: { effectiveFrom: "desc" },
    });
    targetCalls  = target?.calls     ?? 0;
    targetOrders = target?.newOrders ?? 0;

    const employees = await prisma.user.findMany({
      where: { isAdmin: false },
      orderBy: { displayName: "asc" },
    });

    const callLogs = await prisma.reorderCallLog.findMany({
      where: { calledAt: { gte: fromDate, lte: toDate } },
      select: { calledAt: true, calledById: true },
    });

    const orders = await prisma.retailOrder.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        createdByUserId: { not: null },
      },
      select: { date: true, createdByUserId: true },
    });

    for (const emp of employees) {
      const empCalls  = callLogs.filter((l) => l.calledById === emp.id);
      const empOrders = orders.filter((o) => o.createdByUserId === emp.id);

      if (empCalls.length === 0 && empOrders.length === 0) continue;

      // Group by date
      const dayMap = new Map<string, { calls: number; orders: number }>();
      for (const l of empCalls) {
        const ds = toLocalDateStr(l.calledAt);
        const cur = dayMap.get(ds) ?? { calls: 0, orders: 0 };
        dayMap.set(ds, { ...cur, calls: cur.calls + 1 });
      }
      for (const o of empOrders) {
        if (!o.date) continue;
        const ds = toLocalDateStr(o.date);
        const cur = dayMap.get(ds) ?? { calls: 0, orders: 0 };
        dayMap.set(ds, { ...cur, orders: cur.orders + 1 });
      }

      const dailyBreakdown = Array.from(dayMap.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const activeDays = dailyBreakdown.length;
      const totalEmpCalls  = empCalls.length;
      const totalEmpOrders = empOrders.length;
      const avgCalls  = activeDays > 0 ? Math.round(totalEmpCalls  / activeDays) : 0;
      const avgOrders = activeDays > 0 ? Math.round(totalEmpOrders / activeDays) : 0;

      const callsPct  = targetCalls  > 0 ? Math.round((avgCalls  / targetCalls)  * 100) : null;
      const ordersPct = targetOrders > 0 ? Math.round((avgOrders / targetOrders) * 100) : null;
      const overallPct = callsPct !== null && ordersPct !== null
        ? Math.round((callsPct + ordersPct) / 2)
        : callsPct ?? ordersPct;

      reportData.push({
        userId: emp.id,
        name: userLabel(emp),
        calls: totalEmpCalls,
        orders: totalEmpOrders,
        activeDays,
        avgCalls,
        avgOrders,
        callsPct,
        ordersPct,
        overallPct,
        dailyBreakdown,
      });
    }

    // Sort by overall performance descending
    reportData.sort((a, b) => (b.overallPct ?? -1) - (a.overallPct ?? -1));
  }

  const rangeLabel = hasRange
    ? `${new Date(fromStr + "T12:00:00Z").toLocaleDateString("en-PK", { day: "numeric", month: "short" })} – ${new Date(toStr + "T12:00:00Z").toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/performance" className="text-xs text-gray-400 hover:text-gray-600">← Performance</Link>
          <h1 className="text-xl font-semibold tracking-tight mt-1">Performance Report</h1>
          {rangeLabel && <p className="text-xs text-gray-400 mt-0.5">{rangeLabel}</p>}
        </div>
        {hasRange && reportData.length > 0 && <PrintButton />}
      </div>

      {/* Date picker */}
      <div className="print:hidden">
        <ReportForm defaultFrom={fromStr || defaultFrom} defaultTo={toStr || defaultTo} />
      </div>

      {/* No range yet */}
      {!hasRange && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm text-gray-500 font-medium">Select a date range to generate the report</p>
          <p className="text-xs text-gray-400 mt-1">Shows calls, orders, and performance grade for each employee</p>
        </div>
      )}

      {/* Report */}
      {hasRange && reportData.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-sm text-gray-400">No employee activity found in this date range</p>
        </div>
      )}

      {hasRange && reportData.length > 0 && (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Employees Active", value: reportData.length, color: "text-gray-800" },
              { label: "Total Calls", value: reportData.reduce((s, e) => s + e.calls, 0), color: "text-blue-600" },
              { label: "Total Orders", value: reportData.reduce((s, e) => s + e.orders, 0), color: "text-purple-600" },
              {
                label: "Avg Conversion",
                value: (() => {
                  const tc = reportData.reduce((s, e) => s + e.calls, 0);
                  const to = reportData.reduce((s, e) => s + e.orders, 0);
                  return tc > 0 ? `${Math.round((to / tc) * 100)}%` : "—";
                })(),
                color: "text-green-600",
              },
            ].map((c) => (
              <div key={c.label} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Per-employee cards */}
          <div className="space-y-4">
            {reportData.map((emp, rank) => {
              const g = grade(emp.overallPct);
              const callG = grade(emp.callsPct);
              const orderG = grade(emp.ordersPct);
              const conv = emp.calls > 0 ? Math.round((emp.orders / emp.calls) * 100) : 0;

              return (
                <div key={emp.userId} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  {/* Card header */}
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-400 w-5">#{rank + 1}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {emp.activeDays} active day{emp.activeDays !== 1 ? "s" : ""} out of {totalDays} · {conv}% conversion
                      </p>
                    </div>
                    {/* Grade badge */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${g.bg}`}>
                      <span className={`text-2xl font-black ${g.color}`}>{g.label}</span>
                    </div>
                    {emp.overallPct !== null && (
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${g.color}`}>{emp.overallPct}%</p>
                        <p className="text-[10px] text-gray-400">of target</p>
                      </div>
                    )}
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 divide-x divide-gray-100">
                    {/* Calls */}
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Calls</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${callG.bg} ${callG.color}`}>{callG.label}</span>
                      </div>
                      <p className="text-xl font-bold text-blue-600">
                        {emp.calls}
                        {targetCalls > 0 && <span className="text-sm text-gray-400 font-normal"> / {targetCalls * emp.activeDays} total target</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Avg {emp.avgCalls}/day
                        {targetCalls > 0 && ` · target ${targetCalls}/day`}
                      </p>
                      {emp.callsPct !== null && (
                        <div className="mt-2">
                          <ProgressBar pct={emp.callsPct} color={emp.callsPct >= 100 ? "bg-green-500" : emp.callsPct >= 60 ? "bg-amber-500" : "bg-red-400"} />
                          <p className="text-[10px] mt-1 text-gray-500">{emp.callsPct}% of daily target</p>
                        </div>
                      )}
                    </div>

                    {/* Orders */}
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Orders</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${orderG.bg} ${orderG.color}`}>{orderG.label}</span>
                      </div>
                      <p className="text-xl font-bold text-purple-600">
                        {emp.orders}
                        {targetOrders > 0 && <span className="text-sm text-gray-400 font-normal"> / {targetOrders * emp.activeDays} total target</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Avg {emp.avgOrders}/day
                        {targetOrders > 0 && ` · target ${targetOrders}/day`}
                      </p>
                      {emp.ordersPct !== null && (
                        <div className="mt-2">
                          <ProgressBar pct={emp.ordersPct} color={emp.ordersPct >= 100 ? "bg-green-500" : emp.ordersPct >= 60 ? "bg-amber-500" : "bg-red-400"} />
                          <p className="text-[10px] mt-1 text-gray-500">{emp.ordersPct}% of daily target</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Daily breakdown */}
                  <div className="border-t border-gray-100 px-5 py-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Daily Breakdown</p>
                    <div className="flex flex-wrap gap-1.5">
                      {emp.dailyBreakdown.map((day) => {
                        const dayCallPct = targetCalls  > 0 ? (day.calls  / targetCalls)  * 100 : null;
                        const dayOrdPct  = targetOrders > 0 ? (day.orders / targetOrders) * 100 : null;
                        const dayPct = dayCallPct !== null && dayOrdPct !== null
                          ? (dayCallPct + dayOrdPct) / 2
                          : dayCallPct ?? dayOrdPct;
                        const dot = dayPct === null ? "bg-gray-200"
                          : dayPct >= 100 ? "bg-green-500"
                          : dayPct >= 60  ? "bg-amber-400"
                          : "bg-red-400";
                        const label = new Date(day.date + "T12:00:00Z").toLocaleDateString("en-PK", { day: "numeric", month: "short" });
                        return (
                          <div key={day.date} className="text-center" title={`${label}: ${day.calls} calls, ${day.orders} orders`}>
                            <div className={`w-6 h-6 rounded-md ${dot} mx-auto`} />
                            <p className="text-[9px] text-gray-400 mt-0.5">{label.split(" ")[0]}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2.5 h-2.5 rounded bg-green-500 inline-block" />Target met</span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block" />Partial</span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2.5 h-2.5 rounded bg-red-400 inline-block" />Behind</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Print footer */}
          <div className="hidden print:block text-center text-xs text-gray-400 pt-4 border-t border-gray-200">
            Generated {new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })} · ASAAD ERP
          </div>
        </>
      )}
    </div>
  );
}
