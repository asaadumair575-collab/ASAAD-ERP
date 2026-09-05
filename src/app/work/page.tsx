import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ClockInButton from "./ClockInButton";
import AssignTaskModal from "./AssignTaskModal";
import LiveRefresh from "./LiveRefresh";
import TaskStatCard from "@/components/TaskStatCard";
import { getLiveTaskStats } from "@/lib/taskStats";
import { deleteTask } from "@/lib/actions";

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tab?: string; taskDate?: string; taskUser?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { date, tab, taskDate, taskUser } = await searchParams;
  const activeTab = tab === "tasks" ? "tasks" : "clockin";
  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const dayStr = date ?? todayPK;
  const dayStart = new Date(`${dayStr}T00:00:00+05:00`);
  const dayEnd = new Date(`${dayStr}T23:59:59+05:00`);
  // The Tasks tab has its own independent date filter, separate from the
  // clock-in one above — defaults to today when unset.
  const taskDayStr = taskDate ?? todayPK;
  const todayStart = new Date(`${taskDayStr}T00:00:00+05:00`);
  const todayEnd = new Date(`${taskDayStr}T23:59:59+05:00`);
  const taskUserId = taskUser ? parseInt(taskUser) : undefined;

  const Tabs = (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      <Link href="/work" className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "clockin" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
        Clock In Time
      </Link>
      <Link href="/work?tab=tasks" className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "tasks" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
        Tasks
      </Link>
    </div>
  );

  if (me.isAdmin) {
    const [shifts, employees, tasks] = await Promise.all([
      prisma.employeeShift.findMany({
        where: { startedAt: { gte: dayStart, lte: dayEnd } },
        include: { user: { select: { displayName: true, username: true } } },
        orderBy: { startedAt: "asc" },
      }),
      prisma.user.findMany({
        where: { isAdmin: false },
        orderBy: { displayName: "asc" },
        select: { id: true, displayName: true, username: true },
      }),
      activeTab === "tasks"
        ? prisma.employeeTask.findMany({
            where: taskUserId ? { assignedToId: taskUserId } : {},
            include: { assignedTo: { select: { displayName: true, username: true } } },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    const tasksWithStats = await Promise.all(
      tasks.map(async (t) => ({ task: t, stats: await getLiveTaskStats(t.metric, t.assignedToId, t.targetValue, todayStart, todayEnd) }))
    );

    return (
      <div className="max-w-5xl space-y-6">
        <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
          <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Employee</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Work</h1>
          <p className="text-sm text-gray-400 mt-0.5">Daily start times</p>
        </div>

        {Tabs}

        {activeTab === "clockin" && (<>
        <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
          <input type="hidden" name="tab" value="clockin" />
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
        </>)}

        {activeTab === "tasks" && (
          <div className="space-y-4">
            <LiveRefresh />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
                <input type="hidden" name="tab" value="tasks" />
                <select
                  name="taskUser"
                  defaultValue={taskUser ?? ""}
                  className="bg-gray-50 border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">All employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.displayName ?? e.username}</option>
                  ))}
                </select>
                <input
                  type="date"
                  name="taskDate"
                  defaultValue={taskDayStr}
                  max={todayPK}
                  className="bg-gray-50 border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">Filter</button>
                {(taskUser || taskDate) && <Link href="/work?tab=tasks" className="text-sm text-gray-400 hover:text-black px-2">Reset</Link>}
              </form>
              <AssignTaskModal employees={employees} />
            </div>
            {tasksWithStats.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-2xl p-12 text-center space-y-1">
                <p className="text-sm font-medium text-gray-400">No tasks assigned yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tasksWithStats.map(({ task, stats }) => (
                  <TaskStatCard key={task.id} task={task} stats={stats} deleteAction={deleteTask.bind(null, task.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const [shift, myTasks] = await Promise.all([
    prisma.employeeShift.findFirst({
      where: { userId: me.id, startedAt: { gte: dayStart, lte: dayEnd } },
    }),
    activeTab === "tasks"
      ? prisma.employeeTask.findMany({ where: { assignedToId: me.id }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
  ]);
  const hasStarted = !!shift;
  const startTime = shift?.startedAt
    ? shift.startedAt.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: true })
    : null;

  const myTasksWithStats = await Promise.all(
    myTasks.map(async (t) => ({ task: t, stats: await getLiveTaskStats(t.metric, t.assignedToId, t.targetValue, todayStart, todayEnd) }))
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Employee</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">My Work</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {Tabs}

      {activeTab === "clockin" && (
        !hasStarted ? (
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
        )
      )}

      {activeTab === "tasks" && (
        <div className="space-y-4">
          <LiveRefresh />
          {myTasksWithStats.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-2xl p-12 text-center space-y-1">
              <p className="text-sm font-medium text-gray-400">No tasks yet</p>
              <p className="text-xs text-gray-300">Your manager will assign tasks shortly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myTasksWithStats.map(({ task, stats }) => (
                <TaskStatCard key={task.id} task={task} stats={stats} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
