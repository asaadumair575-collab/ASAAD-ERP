"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignTask } from "@/lib/actions";

const TASK_TYPES = [
  {
    metric: "CONFIRM_ORDERS",
    title: "Order Confirmation",
    unit: "orders",
    description: "Confirm every new website order — live count of what's still pending, updates the moment a new order comes in.",
    needsTarget: false,
    defaultTarget: 0,
  },
  {
    metric: "REORDER_CALLS",
    title: "Reordering Calls",
    unit: "calls",
    description: "Calls made today from the reorder campaigns, against a daily target you set.",
    needsTarget: true,
    defaultTarget: 50,
  },
  {
    metric: "LEAD_CALLS",
    title: "B2B Calls",
    unit: "calls",
    description: "Calls made today on B2B leads (shop cold-calling), against a daily target you set.",
    needsTarget: true,
    defaultTarget: 50,
  },
  {
    metric: "RETAIL_ORDERS",
    title: "Daily Orders",
    unit: "orders",
    description: "Retail advance orders the employee entered manually today, against a daily target you set.",
    needsTarget: true,
    defaultTarget: 10,
  },
];

export default function AssignTaskModal({
  employees,
}: {
  employees: { id: number; displayName: string | null; username: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [assignedToId, setAssignedToId] = useState("");
  const [taskType, setTaskType] = useState(TASK_TYPES[0].metric);
  const [targetValue, setTargetValue] = useState(String(TASK_TYPES[0].defaultTarget));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const selected = TASK_TYPES.find((t) => t.metric === taskType)!;
  const canSave = !!assignedToId && (!selected.needsTarget || (parseInt(targetValue) > 0));

  function close() {
    setOpen(false);
    setAssignedToId("");
    setTaskType(TASK_TYPES[0].metric);
    setTargetValue(String(TASK_TYPES[0].defaultTarget));
  }

  function changeTaskType(metric: string) {
    setTaskType(metric);
    const t = TASK_TYPES.find((t) => t.metric === metric)!;
    setTargetValue(String(t.defaultTarget));
  }

  function save() {
    if (!canSave) return;
    startTransition(async () => {
      await assignTask({
        assignedToId: parseInt(assignedToId),
        title: selected.title,
        description: selected.description,
        unit: selected.unit,
        metric: selected.metric,
        targetValue: selected.needsTarget ? parseInt(targetValue) : undefined,
      });
      close();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 bg-[#16202E] text-[#BFD732] text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#232F42] transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        Assign Task
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => { if (!pending) close(); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm space-y-4 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="font-semibold text-sm text-gray-900">Assign Task</p>
              <p className="text-xs text-gray-500 mt-0.5">Pick an employee and a task type.</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Employee</label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">Select employee...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.displayName ?? e.username}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Task Type</label>
              <select
                value={taskType}
                onChange={(e) => changeTaskType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t.metric} value={t.metric}>{t.title}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">{selected.description}</p>
            </div>

            {selected.needsTarget && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Daily Target ({selected.unit})</label>
                <input
                  type="number"
                  min={1}
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending || !canSave}
                className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                {pending ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
