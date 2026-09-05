import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ClockInButton from "./ClockInButton";

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { date } = await searchParams;
  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const dayStr = date ?? todayPK;
  const dayStart = new Date(`${dayStr}T00:00:00+05:00`);
  const dayEnd = new Date(`${dayStr}T23:59:59+05:00`);

  if (me.isAdmin) {
    const shifts = await prisma.employeeShift.findMany({
      where: { startedAt: { gte: dayStart, lte: dayEnd } },
      include: { user: { select: { displayName: true, username: true } } },
      orderBy: { startedAt: "asc" },
    });

    return (
      <div className="max-w-2xl mx-auto py-2 space-y-6">
        <div className="bg-gradient-to-br from-[#16202E] to-[#232F42] rounded-2xl px-6 py-8 text-center shadow-sm">
          <p className="text-xs font-semibold text-[#BFD732] uppercase tracking-widest mb-2">Employee</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">My Work</h1>
          <p className="text-sm text-gray-400 mt-2">Daily start times</p>
        </div>

        <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
          <input
            type="date"
            name="date"
            defaultValue={dayStr}
            max={todayPK}
            className="bg-gray-50 border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">Filter</button>
          {date && <Link href="/work" className="text-sm text-gray-400 hover:text-black px-2">Today</Link>}
        </form>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">
              {new Date(dayStart).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{shifts.length} employee{shifts.length === 1 ? "" : "s"} clocked in</p>
          </div>
          {shifts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No one has clocked in yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {shifts.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm font-medium text-gray-800">{s.user.displayName ?? s.user.username}</span>
                  </div>
                  <span className="text-sm tabular-nums text-gray-500">
                    {s.startedAt.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const shift = await prisma.employeeShift.findFirst({
    where: { userId: me.id, startedAt: { gte: dayStart, lte: dayEnd } },
  });
  const hasStarted = !!shift;
  const startTime = shift?.startedAt
    ? shift.startedAt.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: true })
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">
      <div className="bg-gradient-to-br from-[#16202E] to-[#232F42] rounded-2xl px-6 py-8 text-center shadow-sm">
        <p className="text-xs font-semibold text-[#BFD732] uppercase tracking-widest mb-2">Employee</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">My Work</h1>
        <p className="text-sm text-gray-400 mt-2">
          {new Date().toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {!hasStarted ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <p className="text-base font-semibold text-gray-900">Ready to start your day?</p>
            <p className="text-sm text-gray-400">Your start time will be recorded when you tap below.</p>
          </div>
          <ClockInButton />
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">You&apos;re clocked in</p>
            <p className="text-xs text-green-600 mt-0.5">Started at {startTime}</p>
          </div>
        </div>
      )}
    </div>
  );
}
