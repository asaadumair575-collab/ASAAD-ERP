"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
];

// "YYYY-MM-DD" minus N days, computed in UTC so it is deterministic
// regardless of the browser's timezone.
function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
}

export default function DashboardDateNav({
  from,
  to,
  today,
  basePath,
}: {
  from: string;
  to: string;
  today: string;
  basePath: string;
}) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [isPending, startTransition] = useTransition();
  // Range we just navigated to — highlights the clicked button instantly
  // while the (slow) server render of the new range is still in flight.
  const [pendingRange, setPendingRange] = useState<{ from: string; to: string } | null>(null);

  function go(f: string, t: string) {
    if (isPending) return;
    setPendingRange({ from: f, to: t });
    startTransition(() => {
      router.push(`${basePath}?from=${f}&to=${t}`);
    });
  }

  function presetRange(days: number): { from: string; to: string } {
    if (days === 0) return { from: today, to: today };
    if (days === 1) {
      const y = shiftDate(today, 1);
      return { from: y, to: y };
    }
    return { from: shiftDate(today, days - 1), to: today };
  }

  // While a navigation is pending, reflect the range the user just picked;
  // once the new page renders, props catch up and pending state clears.
  const activeFrom = isPending && pendingRange ? pendingRange.from : from;
  const activeTo = isPending && pendingRange ? pendingRange.to : to;

  function isActive(days: number) {
    const r = presetRange(days);
    return activeFrom === r.from && activeTo === r.to;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.days}
          onClick={() => {
            const r = presetRange(p.days);
            go(r.from, r.to);
          }}
          disabled={isPending}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:cursor-wait ${
            isActive(p.days)
              ? "bg-[#16202E] text-[#BFD732] shadow-sm"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          }`}
        >
          {p.label}
        </button>
      ))}

      {isPending && (
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 animate-spin">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" className="opacity-25" />
            <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Loading…
        </span>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          disabled={isPending}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#BFD732] disabled:opacity-50"
        />
        <span className="text-gray-400 text-sm">—</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          disabled={isPending}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#BFD732] disabled:opacity-50"
        />
        <button
          onClick={() => go(customFrom, customTo)}
          disabled={isPending}
          className="bg-[#16202E] text-[#BFD732] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#232F42] transition-colors disabled:opacity-60 disabled:cursor-wait"
        >
          {isPending ? "…" : "Go"}
        </button>
      </div>
    </div>
  );
}
