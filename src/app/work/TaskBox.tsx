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
  resolvedProgress: number;
  metric: string | null;
};

export default function TaskBox({ task }: { task: Task }) {
  const pct = Math.min(100, Math.round((task.resolvedProgress / task.targetValue) * 100));
  const done = task.resolvedProgress >= task.targetValue;
  const isAuto = !!task.metric;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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

  // Color scheme based on progress
  const scheme = done
    ? { bg: "bg-green-500", track: "bg-green-100", border: "border-green-200", card: "bg-green-50", text: "text-green-700", num: "text-green-800" }
    : pct >= 60
    ? { bg: "bg-blue-500", track: "bg-blue-100", border: "border-blue-200", card: "bg-blue-50", text: "text-blue-600", num: "text-blue-800" }
    : pct >= 30
    ? { bg: "bg-amber-400", track: "bg-amber-100", border: "border-amber-200", card: "bg-amber-50", text: "text-amber-700", num: "text-amber-800" }
    : { bg: "bg-gray-800", track: "bg-gray-100", border: "border-gray-200", card: "bg-white", text: "text-gray-500", num: "text-gray-900" };

  return (
    <>
      <div
        className={`relative border ${scheme.border} ${scheme.card} rounded-2xl p-5 space-y-4 ${!isAuto ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
        onClick={() => { if (!isAuto) { setOpen(true); setInput(String(task.resolvedProgress)); } }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{task.unit}</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5 leading-tight">{task.title}</p>
            {task.description && (
              <p className="text-xs text-gray-400 mt-1 leading-snug">{task.description}</p>
            )}
          </div>
          {done ? (
            <span className="shrink-0 text-lg">✅</span>
          ) : isAuto ? (
            <span className="shrink-0 text-[10px] font-semibold text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">AUTO</span>
          ) : (
            <span className="shrink-0 text-[10px] font-semibold text-gray-300 border border-gray-200 px-2 py-0.5 rounded-full">tap to update</span>
          )}
        </div>

        {/* Big number */}
        <div className="flex items-end gap-1">
          <span className={`text-4xl font-bold tabular-nums leading-none ${scheme.num}`}>
            {task.resolvedProgress}
          </span>
          <span className="text-sm font-medium text-gray-300 mb-1">/ {task.targetValue}</span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className={`h-2.5 rounded-full ${scheme.track} overflow-hidden`}>
            <div
              className={`h-full rounded-full ${scheme.bg} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold ${scheme.text}`}>
              {done ? "Target reached!" : `${pct}%`}
            </p>
            <p className="text-xs text-gray-400">
              {task.targetValue - task.resolvedProgress > 0
                ? `${task.targetValue - task.resolvedProgress} to go`
                : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Manual update modal */}
      {open && !isAuto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{task.unit}</p>
              <h3 className="text-sm font-semibold text-gray-800 mt-0.5">{task.title}</h3>
            </div>

            <div className="text-center space-y-1">
              <label className="text-xs font-medium text-gray-500 block">Current count</label>
              <input
                type="number"
                min={0}
                max={task.targetValue}
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-3xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-black tabular-nums"
              />
              <p className="text-xs text-gray-400">out of {task.targetValue} {task.unit}</p>
            </div>

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

            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={pending}
                className="flex-1 bg-black text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
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
