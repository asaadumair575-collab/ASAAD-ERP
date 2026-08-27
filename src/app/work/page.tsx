import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClockInButton from "./ClockInButton";
import TaskBox from "./TaskBox";

async function getAutoProgress(metric: string, userId: number, date: Date): Promise<number> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  if (metric === "REORDER_CALLS") {
    return prisma.reorderCallLog.count({
      where: { calledById: userId, calledAt: { gte: dayStart, lt: dayEnd } },
    });
  }
  if (metric === "RETAIL_ORDERS") {
    return prisma.retailOrder.count({
      where: { createdByUserId: userId, createdAt: { gte: dayStart, lt: dayEnd } },
    });
  }
  return 0;
}

export default async function WorkPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [shift, tasks] = await Promise.all([
    prisma.employeeShift.findFirst({
      where: { userId: session.id, startedAt: { gte: today, lt: tomorrow } },
    }),
    prisma.employeeTask.findMany({
      where: { assignedToId: session.id, date: { gte: today, lt: tomorrow } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Resolve auto-progress for tasks with metrics
  const tasksWithProgress = await Promise.all(
    tasks.map(async (t) => {
      const progress = t.metric
        ? await getAutoProgress(t.metric, session.id, today)
        : t.progress;
      return { ...t, resolvedProgress: progress };
    })
  );

  const hasStarted = !!shift;
  const completedCount = tasksWithProgress.filter((t) => t.resolvedProgress >= t.targetValue).length;

  const startTime = shift?.startedAt
    ? new Date(shift.startedAt).toLocaleTimeString("en-PK", {
        hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi",
      })
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight mt-0.5">My Work</h1>
        </div>
        {hasStarted && tasks.length > 0 && (
          <p className="text-xs text-gray-400 pb-1">{completedCount}/{tasks.length} done</p>
        )}
      </div>

      {/* Clock-in card */}
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

      {/* Tasks grid */}
      {hasStarted && (
        <>
          {tasks.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-2xl p-12 text-center space-y-1">
              <p className="text-sm font-medium text-gray-400">No tasks for today</p>
              <p className="text-xs text-gray-300">Your manager will assign tasks shortly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tasksWithProgress.map((task) => (
                <TaskBox key={task.id} task={task} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
