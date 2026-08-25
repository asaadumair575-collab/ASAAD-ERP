import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canView, parsePermissions } from "@/lib/permissions";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const DIRECTION_LABELS: Record<string, { label: string; color: string }> = {
  OUTGOING: { label: "Outgoing", color: "bg-blue-100 text-blue-700" },
  INCOMING: { label: "Incoming", color: "bg-violet-100 text-violet-700" },
  MISSED:   { label: "Missed",   color: "bg-red-100 text-red-600" },
};

export default async function EmployeeCallVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string; date?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  const perms = parsePermissions(me.permissions);
  if (!canView(perms, "employee_call_verification", me.isAdmin)) redirect("/");

  const { employeeId, date } = await searchParams;
  const selectedDate = date ?? new Date().toISOString().slice(0, 10);

  const dayStart = new Date(`${selectedDate}T00:00:00`);
  const dayEnd = new Date(`${selectedDate}T23:59:59.999`);

  const employees = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true },
    orderBy: { username: "asc" },
  });

  const where = {
    calledAt: { gte: dayStart, lte: dayEnd },
    ...(employeeId ? { userId: parseInt(employeeId) } : {}),
  };

  const logs = await prisma.phoneCallLog.findMany({
    where,
    include: { user: { select: { displayName: true, username: true } } },
    orderBy: { calledAt: "desc" },
  });

  const totalCalls = logs.length;
  const connectedCalls = logs.filter((l) => l.duration > 0).length;
  const notConnectedCalls = totalCalls - connectedCalls;
  const totalTalkSeconds = logs.reduce((sum, l) => sum + l.duration, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Employee Call Verification</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Har call ka asli duration aur status seedha employee ke phone ke call log se — kisi ke type kiye hue se nahi.
        </p>
      </div>

      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <select
          name="employeeId"
          defaultValue={employeeId ?? ""}
          className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">Sab Employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.displayName || e.username}</option>
          ))}
        </select>
        <input
          type="date"
          name="date"
          defaultValue={selectedDate}
          className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Filter
        </button>
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Calls", value: totalCalls, color: "text-gray-700" },
          { label: "Connected", value: connectedCalls, color: "text-green-600" },
          { label: "Not Connected", value: notConnectedCalls, color: "text-red-500" },
          { label: "Total Talk Time", value: formatDuration(totalTalkSeconds), color: "text-violet-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">
            Is date/employee ke liye koi call record nahi hai
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="py-3 px-4 text-left">Employee</th>
                <th className="py-3 px-4 text-left">Number / Contact</th>
                <th className="py-3 px-4 text-left">Direction</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Duration</th>
                <th className="py-3 px-4 text-left">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const dir = DIRECTION_LABELS[log.callType] ?? { label: log.callType, color: "bg-gray-100 text-gray-500" };
                const connected = log.duration > 0;
                return (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2.5 px-4 text-gray-700">{log.user.displayName || log.user.username}</td>
                    <td className="py-2.5 px-4 text-gray-600">{log.contactName || log.phoneNumber}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${dir.color}`}>
                        {dir.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${connected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {connected ? "Connected" : "Not Connected"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-600">{formatDuration(log.duration)}</td>
                    <td className="py-2.5 px-4 text-gray-400 text-xs">
                      {log.calledAt.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
