import DeleteButton from "@/components/DeleteButton";
import EditTaskTargetButton from "@/app/work/EditTaskTargetButton";

const EDITABLE_METRICS = ["REORDER_CALLS", "LEAD_CALLS", "RETAIL_ORDERS"];

export default function TaskStatCard({
  task,
  stats,
  deleteAction,
}: {
  task: { id: number; title: string; description: string | null; unit: string; metric: string | null; targetValue: number; assignedTo?: { displayName: string | null; username: string } };
  stats: { remaining: number; doneToday: number; remainingLabel: string };
  deleteAction?: () => Promise<void>;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{task.title}</p>
          {task.assignedTo && (
            <p className="text-xs text-gray-400 mt-0.5">{task.assignedTo.displayName ?? task.assignedTo.username}</p>
          )}
        </div>
        {deleteAction && (
          <div className="flex items-center gap-3 shrink-0">
            {task.metric && EDITABLE_METRICS.includes(task.metric) && (
              <EditTaskTargetButton taskId={task.id} currentTarget={task.targetValue} />
            )}
            <DeleteButton action={deleteAction} message="Remove this task?" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-6 pt-1">
        <div>
          <p className={`text-2xl font-bold tabular-nums ${stats.remaining > 0 ? "text-red-600" : "text-[#16202E]"}`}>{stats.remaining}</p>
          <p className="text-xs text-gray-400">{stats.remainingLabel}</p>
        </div>
        <div className="w-px h-8 bg-gray-100" />
        <div>
          <p className="text-2xl font-bold text-green-600 tabular-nums">{stats.doneToday}</p>
          <p className="text-xs text-gray-400">Done today</p>
        </div>
      </div>
      {(() => {
        const total = stats.doneToday + stats.remaining;
        const pct = total > 0 ? Math.min(100, Math.round((stats.doneToday / total) * 100)) : 0;
        return (
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-[#16202E]"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 text-right">{pct}%</p>
          </div>
        );
      })()}
    </div>
  );
}
