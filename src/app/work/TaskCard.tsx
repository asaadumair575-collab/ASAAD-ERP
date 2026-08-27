"use client";

import { useState, useTransition } from "react";
import { updateTaskProgress } from "@/lib/actions";
import { useRouter } from "next/navigation";

type Task = {
  id: number;
  title: string;
  description: string | null;
  targetValue: number;
  unit: string;
  progress: number;
  completedAt: Date | null;
};

export default function TaskCard({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const pct = Math.min(100, Math.round((task.progress / task.targetValue) * 100));
  const done = task.progress >= task.targetValue;

  function save() {
    const val = parseInt(input);
    if (isNaN(val) || val < 0) return;
    startTransition(async () => {
      await updateTaskProgress(task.id, val);
      setOpen(false);
      setInput("");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setInput(String(task.progress)); }}
        className={`w-full text-left rounded-2xl border p-4 space-y-3 transition-colors hover:bg-gray-50 ${
          done ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
        }`}
      >
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${done ? "text-green-800" : "text-gray-800"}`}>
              {done && "✓ "}{task.title}
            </p>
            {task.description && (
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{task.description}</p>
            )}
          </div>
          <span className={`shrink-0 text-xs font-bold tabular-nums ${done ? "text-green-600" : "text-gray-500"}`}>
            {task.progress}/{task.targetValue} {task.unit}
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${done ? "bg-green-500" : "bg-black"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={`text-[11px] font-medium ${done ? "text-green-600" : "text-gray-400"}`}>
            {done ? "Completed!" : `${pct}% done`}
          </p>
        </div>
      </button>

      {/* Progress update modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">{task.title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Target: {task.targetValue} {task.unit}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">
                Update progress ({task.unit})
              </label>
              <input
                type="number"
                min={0}
                max={task.targetValue}
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-black tabular-nums"
              />
              <p className="text-xs text-gray-400 text-center mt-1">out of {task.targetValue}</p>
            </div>

            {/* Quick +1 / +5 */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 5, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setInput(String(Math.min(task.targetValue, (parseInt(input) || 0) + n)))}
                  className="border border-gray-200 rounded-lg py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  +{n}
                </button>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-700 px-3 py-2 rounded-lg">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={pending}
                className="bg-black text-white text-sm font-semibold px-6 py-2 rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                {pending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
