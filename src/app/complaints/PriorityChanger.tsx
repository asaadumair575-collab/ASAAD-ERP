"use client";
import { useTransition } from "react";
import { setComplaintPriority } from "@/lib/actions";
import { PRIORITY_STYLE } from "./PriorityBadge";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function PriorityChanger({ id, current }: { id: number; current: string }) {
  const [pending, start] = useTransition();

  function change(p: string) {
    if (p === current) return;
    start(() => setComplaintPriority(id, p));
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400">Priority:</span>
      {PRIORITIES.map((p) => (
        <button
          key={p}
          onClick={() => change(p)}
          disabled={pending}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
            p === current
              ? `${PRIORITY_STYLE[p]} ring-2 ring-offset-1 ring-current`
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
        >
          {p.charAt(0) + p.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
  );
}
