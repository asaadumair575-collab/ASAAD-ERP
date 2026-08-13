import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { userLabel } from "@/lib/userLabel";
import { todayPK, pkDayStart, pkDayEnd } from "@/lib/tz";
import PerformanceFilter from "./PerformanceFilter";
import { Suspense } from "react";

function dateLabelForStr(dateStr: string, todayStr: string) {
  const yesterdayStr = (() => {
    const d = new Date(todayStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatPkTime(date: Date) {
  const pkMs = date.getTime() + 5 * 60 * 60 * 1000;
  const h = Math.floor((pkMs / (1000 * 60 * 60)) % 24);
  const m = Math.floor((pkMs / (1000 * 60)) % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function hourLabel(h: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}`;
}
function hourLabelFull(h: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${ampm}`;
}

// SVG bar chart rendered server-side
function HourlyBarChart({
  hourData,
}: {
  hourData: { hour: number; calls: number; orders: number }[];
}) {
  if (hourData.length === 0) return null;

  const W = 560;
  const H = 130;
  const padL = 28;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(...hourData.map((d) => d.calls + d.orders), 1);
  const yTicks = maxVal <= 5 ? maxVal : 5;

  const slotW = chartW / hourData.length;
  const barGroup = slotW * 0.72;
  const barW = hourData.length > 1 ? Math.max(4, barGroup / 2 - 1) : Math.max(8, barGroup / 2 - 1);
  const gap = 2;

  function yPos(v: number) {
    return padT + chartH - (v / maxVal) * chartH;
  }
  function barH(v: number) {
    return (v / maxVal) * chartH;
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: "block", overflow: "visible" }}
      aria-label="Hourly calls and orders chart"
    >
      {/* Y grid lines */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = Math.round((maxVal * i) / yTicks);
        const y = yPos(v);
        return (
          <g key={i}>
            <line
              x1={padL} y1={y} x2={W - padR} y2={y}
              stroke="#f3f4f6" strokeWidth="1"
            />
            {v > 0 && (
              <text x={padL - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9ca3af">
                {v}
              </text>
            )}
          </g>
        );
      })}

      {/* Baseline */}
      <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="#e5e7eb" strokeWidth="1" />

      {/* Bars */}
      {hourData.map((d, i) => {
        const cx = padL + i * slotW + slotW / 2;
        const callBarH = barH(d.calls);
        const orderBarH = barH(d.orders);
        const callX = cx - barW - gap / 2;
        const orderX = cx + gap / 2;
        const baseline = padT + chartH;

        return (
          <g key={d.hour}>
            {/* Calls bar */}
            {d.calls > 0 && (
              <>
                <rect
                  x={callX} y={baseline - callBarH}
                  width={barW} height={callBarH}
                  fill="#3b82f6" rx="3" ry="3"
                />
                {callBarH > 14 && (
                  <text x={callX + barW / 2} y={baseline - callBarH + 9} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">
                    {d.calls}
                  </text>
                )}
              </>
            )}
            {/* Orders bar */}
            {d.orders > 0 && (
              <>
                <rect
                  x={orderX} y={baseline - orderBarH}
                  width={barW} height={orderBarH}
                  fill="#a855f7" rx="3" ry="3"
                />
                {orderBarH > 14 && (
                  <text x={orderX + barW / 2} y={baseline - orderBarH + 9} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">
                    {d.orders}
                  </text>
                )}
              </>
            )}
            {/* X label */}
            <text
              x={cx} y={baseline + 12}
              textAnchor="middle" fontSize="9" fill="#9ca3af"
            >
              {hourLabel(d.hour)}
            </text>
            {/* AM/PM marker on first of each */}
            {(i === 0 || (d.hour === 12)) && (
              <text x={cx} y={baseline + 20} textAnchor="middle" fontSize="7.5" fill="#d1d5db">
                {d.hour < 12 ? "AM" : "PM"}
              </text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${padL}, ${padT - 4})`}>
        <rect x="0" y="0" width="8" height="8" fill="#3b82f6" rx="2" />
        <text x="11" y="7.5" fontSize="9" fill="#6b7280">Calls</text>
        <rect x="42" y="0" width="8" height="8" fill="#a855f7" rx="2" />
        <text x="53" y="7.5" fontSize="9" fill="#6b7280">Orders</text>
      </g>
    </svg>
  );
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; custom?: string; user?: string }>;
}) {
  const sp = await searchParams;
  const me = await getSessionUser();
  const isAdmin = me?.isAdmin ?? false;

  const todayStr = todayPK();
  const yesterdayStr = (() => {
    const d = new Date(todayStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const dateMode = sp.date ?? "today";
  let selectedDateStr: string;
  if (dateMode === "yesterday") selectedDateStr = yesterdayStr;
  else if (dateMode === "custom" && sp.custom) selectedDateStr = sp.custom;
  else selectedDateStr = todayStr;

  const dayStart = pkDayStart(selectedDateStr);
  const dayEnd = pkDayEnd(selectedDateStr);

  const filterUserId = isAdmin && sp.user
    ? parseInt(sp.user)
    : (!isAdmin ? me?.id ?? undefined : undefined);

  const users = isAdmin
    ? await prisma.user.findMany({ where: { isAdmin: false }, orderBy: { displayName: "asc" } })
    : [];

  const callLogs = await prisma.reorderCallLog.findMany({
    where: {
      calledAt: { gte: dayStart, lte: dayEnd },
      ...(filterUserId ? { calledById: filterUserId } : {}),
    },
    select: {
      id: true,
      calledAt: true,
      status: true,
      lead: { select: { customerName: true } },
    },
    orderBy: { calledAt: "asc" },
  });

  const orders = await prisma.retailOrder.findMany({
    where: {
      date: { gte: dayStart, lte: dayEnd },
      createdByUserId: { not: null },
      ...(filterUserId ? { createdByUserId: filterUserId } : {}),
    },
    select: {
      id: true,
      customerName: true,
      totalAmount: true,
      date: true,
    },
    orderBy: { date: "asc" },
  });

  const totalCalls = callLogs.length;
  const totalOrders = orders.length;
  const convRate = totalCalls > 0 ? Math.round((totalOrders / totalCalls) * 100) : null;

  // Target for the selected date
  const target = await prisma.performanceTarget.findFirst({
    where: { effectiveFrom: { lte: dayEnd } },
    orderBy: { effectiveFrom: "desc" },
  });
  const targetCalls = target?.calls ?? 0;
  const targetOrders = target?.newOrders ?? 0;
  const callsPct = targetCalls > 0 ? Math.min(100, Math.round((totalCalls / targetCalls) * 100)) : null;
  const ordersPct = targetOrders > 0 ? Math.min(100, Math.round((totalOrders / targetOrders) * 100)) : null;
  const callsBehind = targetCalls > 0 ? Math.max(0, targetCalls - totalCalls) : 0;
  const ordersBehind = targetOrders > 0 ? Math.max(0, targetOrders - totalOrders) : 0;

  // Group by PK hour
  const callsByHour = new Map<number, typeof callLogs>();
  for (const log of callLogs) {
    const pkHour = (log.calledAt.getUTCHours() + 5) % 24;
    const arr = callsByHour.get(pkHour) ?? [];
    arr.push(log);
    callsByHour.set(pkHour, arr);
  }

  const ordersByHour = new Map<number, typeof orders>();
  for (const o of orders) {
    const pkHour = (o.date.getUTCHours() + 5) % 24;
    const arr = ordersByHour.get(pkHour) ?? [];
    arr.push(o);
    ordersByHour.set(pkHour, arr);
  }

  const allHours = Array.from(
    new Set([...callsByHour.keys(), ...ordersByHour.keys()])
  ).sort((a, b) => a - b);

  // Bar chart data — include all hours between first and last active hour
  const chartData = allHours.length > 0
    ? Array.from(
        { length: allHours[allHours.length - 1] - allHours[0] + 1 },
        (_, i) => {
          const h = allHours[0] + i;
          return { hour: h, calls: callsByHour.get(h)?.length ?? 0, orders: ordersByHour.get(h)?.length ?? 0 };
        }
      )
    : [];

  // Peak hour for calls
  let peakHour: number | null = null;
  let peakCount = 0;
  for (const [h, logs] of callsByHour) {
    if (logs.length > peakCount) { peakCount = logs.length; peakHour = h; }
  }

  const selectedUserLabel = filterUserId
    ? (users.find((u) => u.id === filterUserId)
        ? userLabel(users.find((u) => u.id === filterUserId)!)
        : "Employee")
    : isAdmin ? "All Employees" : userLabel(me!);

  const dateLabel = dateLabelForStr(selectedDateStr, todayStr);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Performance</h1>
          <p className="text-xs text-gray-400 mt-0.5">{selectedUserLabel} · {dateLabel}</p>
        </div>
        {isAdmin && (
          <Link
            href="/performance/targets"
            className="border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
          >
            Set Targets
          </Link>
        )}
      </div>

      <Suspense>
        <PerformanceFilter users={users} isAdmin={isAdmin} />
      </Suspense>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Calls card */}
        <div className={`bg-white border-2 rounded-2xl p-5 shadow-sm ${
          callsPct === null ? "border-gray-200" :
          callsPct >= 100 ? "border-green-300" :
          callsPct >= 60 ? "border-amber-300" : "border-red-300"
        }`}>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 font-semibold">Calls Made</p>
          <div className="flex items-end gap-1.5">
            <p className="text-3xl font-bold text-blue-600 tabular-nums leading-none">{totalCalls}</p>
            {targetCalls > 0 && (
              <p className="text-xs text-gray-400 mb-0.5">/ {targetCalls}</p>
            )}
          </div>
          {callsPct !== null && (
            <>
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${callsPct >= 100 ? "bg-green-500" : callsPct >= 60 ? "bg-amber-500" : "bg-red-400"}`}
                  style={{ width: `${callsPct}%` }}
                />
              </div>
              <p className={`text-[11px] mt-1.5 font-medium ${callsPct >= 100 ? "text-green-600" : callsPct >= 60 ? "text-amber-600" : "text-red-500"}`}>
                {callsPct >= 100
                  ? `✓ Target met`
                  : `${callsPct}% · ${callsBehind} more needed`}
              </p>
            </>
          )}
          {callsPct === null && (
            <p className="text-[10px] text-gray-400 mt-2">{dateLabel}</p>
          )}
        </div>

        {/* Orders card */}
        <div className={`bg-white border-2 rounded-2xl p-5 shadow-sm ${
          ordersPct === null ? "border-gray-200" :
          ordersPct >= 100 ? "border-green-300" :
          ordersPct >= 60 ? "border-amber-300" : "border-red-300"
        }`}>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 font-semibold">Orders Taken</p>
          <div className="flex items-end gap-1.5">
            <p className="text-3xl font-bold text-purple-600 tabular-nums leading-none">{totalOrders}</p>
            {targetOrders > 0 && (
              <p className="text-xs text-gray-400 mb-0.5">/ {targetOrders}</p>
            )}
          </div>
          {ordersPct !== null && (
            <>
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${ordersPct >= 100 ? "bg-green-500" : ordersPct >= 60 ? "bg-amber-500" : "bg-red-400"}`}
                  style={{ width: `${ordersPct}%` }}
                />
              </div>
              <p className={`text-[11px] mt-1.5 font-medium ${ordersPct >= 100 ? "text-green-600" : ordersPct >= 60 ? "text-amber-600" : "text-red-500"}`}>
                {ordersPct >= 100
                  ? `✓ Target met`
                  : `${ordersPct}% · ${ordersBehind} more needed`}
              </p>
            </>
          )}
          {ordersPct === null && (
            <p className="text-[10px] text-gray-400 mt-2">{dateLabel}</p>
          )}
        </div>

        {/* Conversion card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 font-semibold">Conversion</p>
          <p className="text-3xl font-bold text-green-600 tabular-nums leading-none">
            {convRate !== null ? `${convRate}%` : "—"}
          </p>
          <p className="text-[10px] text-gray-400 mt-2">
            {totalCalls > 0 ? `${totalOrders} of ${totalCalls} calls` : "No calls yet"}
          </p>
        </div>
      </div>

      {/* Overall target banner */}
      {(callsPct !== null || ordersPct !== null) && (callsBehind > 0 || ordersBehind > 0) && (
        <div className={`rounded-xl px-4 py-3 border text-sm flex items-center gap-3 ${
          (callsPct ?? 100) >= 100 && (ordersPct ?? 100) >= 100
            ? "bg-green-50 border-green-200 text-green-800"
            : ((callsPct ?? 100) < 60 || (ordersPct ?? 100) < 60)
            ? "bg-red-50 border-red-200 text-red-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          <span className="text-base">
            {(callsPct ?? 100) >= 100 && (ordersPct ?? 100) >= 100 ? "✅" :
             ((callsPct ?? 100) < 60 || (ordersPct ?? 100) < 60) ? "🔴" : "⏳"}
          </span>
          <span>
            {callsBehind > 0 && ordersBehind > 0
              ? `${callsBehind} more calls and ${ordersBehind} more orders needed to hit today's target`
              : callsBehind > 0
              ? `${callsBehind} more calls needed to hit today's target`
              : `${ordersBehind} more orders needed to hit today's target`}
          </span>
        </div>
      )}

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Calls &amp; Orders by Hour</p>
            {peakHour !== null && (
              <p className="text-[11px] text-gray-400">
                Peak: <span className="font-semibold text-gray-600">{hourLabelFull(peakHour)}</span> · {peakCount} calls
              </p>
            )}
          </div>
          <HourlyBarChart hourData={chartData} />
        </div>
      )}

      {/* Hourly timeline */}
      {allHours.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Activity Log
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {allHours.map((hour) => {
              const hourCalls = callsByHour.get(hour) ?? [];
              const hourOrders = ordersByHour.get(hour) ?? [];
              return (
                <div key={hour} className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-gray-500 w-16 shrink-0">
                      {hourLabelFull(hour)}
                    </span>
                    <div className="flex gap-2">
                      {hourCalls.length > 0 && (
                        <span className="text-[11px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {hourCalls.length} call{hourCalls.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {hourOrders.length > 0 && (
                        <span className="text-[11px] font-medium bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                          {hourOrders.length} order{hourOrders.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 ml-16">
                    {hourCalls.map((log) => (
                      <div key={log.id} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span className="text-[11px] text-gray-400 w-14 shrink-0 tabular-nums">
                          {formatPkTime(log.calledAt)}
                        </span>
                        <span className="text-xs text-gray-600">
                          Called{log.lead?.customerName ? ` ${log.lead.customerName}` : ""}
                          {log.status && log.status !== "PENDING" && (
                            <span className="ml-1 text-gray-400">· {log.status.toLowerCase().replace("_", " ")}</span>
                          )}
                        </span>
                      </div>
                    ))}

                    {hourOrders.map((o) => (
                      <div key={o.id} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                        <span className="text-[11px] text-gray-400 w-14 shrink-0 tabular-nums">
                          {formatPkTime(o.date)}
                        </span>
                        <span className="text-xs text-gray-600">
                          Order — {o.customerName}
                          <span className="ml-1 text-gray-400">· ₨{o.totalAmount.toLocaleString()}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No activity for {dateLabel.toLowerCase()}</p>
          <p className="text-xs text-gray-300 mt-1">Calls and orders will appear here as they happen</p>
        </div>
      )}
    </div>
  );
}
