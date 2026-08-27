import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClockInButton from "./ClockInButton";
import TaskCard from "./TaskCard";

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

  const hasStarted = !!shift;
  const completedCount = tasks.filter((t) => t.progress >= t.targetValue).length;

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Work</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Clock-in card */}
      <div className={`rounded-2xl border p-5 ${hasStarted ? "bg-green-50 border-green-200" : "bg-white border-gray-200 shadow-sm"}`}>
        {hasStarted ? (
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">You&apos;re clocked in</p>
              <p className="text-xs text-green-600 mt-0.5">
                Started at {shift!.startedAt.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" })}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">Ready to start?</p>
              <p className="text-xs text-gray-500 mt-0.5">Your start time will be recorded when you tap below.</p>
            </div>
            <ClockInButton />
          </div>
        )}
      </div>

      {/* Tasks */}
      {hasStarted && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Today&apos;s Tasks</h2>
            {tasks.length > 0 && (
              <span className="text-xs text-gray-400">{completedCount}/{tasks.length} done</span>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-2xl p-10 text-center">
              <p className="text-sm text-gray-400">No tasks assigned for today.</p>
              <p className="text-xs text-gray-300 mt-1">Your manager will assign tasks shortly.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))
          )}
        </div>
      )}

      {!hasStarted && tasks.length > 0 && (
        <p className="text-xs text-center text-gray-400">Clock in to see and work on your tasks.</p>
      )}
    </div>
  );
}
