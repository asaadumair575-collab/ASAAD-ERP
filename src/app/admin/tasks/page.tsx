import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

import { redirect } from "next/navigation";
import AssignTaskForm from "./AssignTaskForm";
import TemplateForm from "./TemplateForm";
import TemplateToggle from "./TemplateToggle";
import { deleteTask, deleteTaskTemplate } from "@/lib/actions";
import DeleteButton from "@/components/DeleteButton";

export default async function AdminTasksPage() {
  const session = await getSessionUser();
  if (!session?.isAdmin) redirect("/");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [employees, tasks, templates] = await Promise.all([
    prisma.user.findMany({
      where: { isAdmin: false },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, username: true },
    }),
    prisma.employeeTask.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: { assignedTo: { select: { displayName: true, username: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.taskTemplate.findMany({
      include: { assignedTo: { select: { displayName: true, username: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assign Tasks</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <TemplateForm employees={employees} />

      {/* Recurring templates */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recurring Daily Tasks</h2>
        {templates.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-400">No recurring tasks set up yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => {
              const deleteTemplateBound = deleteTaskTemplate.bind(null, t.id);
              return (
                <div key={t.id} className="border border-gray-200 rounded-2xl p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.assignedTo.displayName ?? t.assignedTo.username} · {t.targetValue} {t.unit}
                      {t.metric && <span className="text-green-600"> · auto-tracked</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TemplateToggle id={t.id} active={t.active} />
                    <DeleteButton action={deleteTemplateBound} message="Delete this recurring task?" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <h2 className="text-sm font-semibold text-gray-700 -mb-2">One-off Task (today only)</h2>
      <AssignTaskForm employees={employees} defaultDate={todayStr} />

      {/* Today's assigned tasks */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Today&apos;s Tasks</h2>
        {tasks.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-400">No tasks assigned today yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => {
              const pct = Math.min(100, Math.round((t.progress / t.targetValue) * 100));
              const done = t.progress >= t.targetValue;
              const deleteTaskBound = deleteTask.bind(null, t.id);
              return (
                <div key={t.id} className={`border rounded-2xl p-4 space-y-2 ${done ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.assignedTo.displayName ?? t.assignedTo.username} · {t.progress}/{t.targetValue} {t.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold ${done ? "text-green-600" : "text-gray-500"}`}>{pct}%</span>
                      <DeleteButton action={deleteTaskBound} message="Delete this task?" />
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${done ? "bg-green-500" : "bg-black"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
