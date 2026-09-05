"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateTaskTarget } from "@/lib/actions";

export default function EditTaskTargetButton({ taskId, currentTarget }: { taskId: number; currentTarget: number }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(currentTarget));
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function save() {
    const n = parseInt(value);
    if (!n || n <= 0) return;
    startTransition(async () => {
      await updateTaskTarget(taskId, n);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        Edit
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-2">
          <label className="text-xs font-medium text-gray-600 block">Daily Target</label>
          <input
            type="number"
            min={1}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="w-full bg-black text-white text-xs font-medium py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
