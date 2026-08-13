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

  // Calls from ReorderCallLog (has individual timestamps per call)
  const callLogs = await prisma.reorderCallLog.findMany({
    where: {
      calledAt: { gte: dayStart, lte: dayEnd },
      ...(filterUserId ? { calledById: filterUserId } : {}),
    },
    select: {
      id: true,
      calledAt: true,
      status: true,
      calledBy: { select: { displayName: true, username: true } },
      lead: { select: { customerName: true } },
    },
    orderBy: { calledAt: "asc" },
  });

  // Orders from RetailOrder
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
      createdBy: { select: { displayName: true, username: true } },
    },
    orderBy: { date: "asc" },
  });

  const totalCalls = callLogs.length;
  const totalOrders = orders.length;

  // Group calls by hour (in PK timezone, UTC+5)
  const callsByHour = new Map<number, typeof callLogs>();
  for (const log of callLogs) {
    const pkHour = (log.calledAt.getUTCHours() + 5) % 24;
    const existing = callsByHour.get(pkHour) ?? [];
    existing.push(log);
    callsByHour.set(pkHour, existing);
  }

  // Group orders by hour too
  const ordersByHour = new Map<number, typeof orders>();
  for (const o of orders) {
    const pkHour = (o.date.getUTCHours() + 5) % 24;
    const existing = ordersByHour.get(pkHour) ?? [];
    existing.push(o);
    ordersByHour.set(pkHour, existing);
  }

  // All active hours
  const allHours = Array.from(
    new Set([...callsByHour.keys(), ...ordersByHour.keys()])
  ).sort((a, b) => a - b);

  const selectedUserLabel = filterUserId
    ? (users.find((u) => u.id === filterUserId)
        ? userLabel(users.find((u) => u.id === filterUserId)!)
        : "Employee")
    : isAdmin ? "All Employees" : userLabel(me!);

  const dateLabel = dateLabelForStr(selectedDateStr, todayStr);

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
    return `${h12}:00 ${ampm}`;
  }

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
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Calls Made</p>
          <p className="text-4xl font-bold text-blue-600 tabular-nums">{totalCalls}</p>
          <p className="text-xs text-gray-400 mt-1">{dateLabel}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Orders Taken</p>
          <p className="text-4xl font-bold text-purple-600 tabular-nums">{totalOrders}</p>
          <p className="text-xs text-gray-400 mt-1">{dateLabel}</p>
        </div>
      </div>

      {/* Hourly timeline */}
      {allHours.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Activity Timeline
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {allHours.map((hour) => {
              const hourCalls = callsByHour.get(hour) ?? [];
              const hourOrders = ordersByHour.get(hour) ?? [];
              return (
                <div key={hour} className="px-5 py-4">
                  {/* Hour header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-gray-500 w-16 shrink-0">
                      {hourLabel(hour)}
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

                  {/* Call entries */}
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

                    {/* Order entries */}
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
