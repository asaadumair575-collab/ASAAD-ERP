"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function toLocal(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
}

function todayPK() {
  return toLocal(new Date());
}

function daysAgo(n: number) {
  return toLocal(new Date(Date.now() - n * 86400000));
}

function startOfMonth(monthsBack: number) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return toLocal(d);
}

function endOfLastMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), 0);
  return toLocal(d);
}

type Preset = { key: string; label: string; from: () => string; to: () => string };

const PRESETS: Preset[] = [
  { key: "today", label: "Today", from: todayPK, to: todayPK },
  { key: "yesterday", label: "Yesterday", from: () => daysAgo(1), to: () => daysAgo(1) },
  { key: "7d", label: "Last 7 Days", from: () => daysAgo(6), to: todayPK },
  { key: "30d", label: "Last 30 Days", from: () => daysAgo(29), to: todayPK },
  { key: "this_month", label: "This Month", from: () => startOfMonth(0), to: todayPK },
  { key: "last_month", label: "Last Month", from: () => startOfMonth(1), to: endOfLastMonth },
];

function activePresetKey(from: string, to: string): string {
  for (const p of PRESETS) {
    if (from === p.from() && to === p.to()) return p.key;
  }
  return "custom";
}

function rangeLabel(from: string, to: string) {
  if (from === to) {
    return new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  }
  const days = Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000) + 1;
  return `${days} days selected`;
}

const CalendarIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
    <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ChevronIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 shrink-0">
    <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function DateRangeNav({ from, to, basePath }: { from: string; to: string; basePath: string }) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function go(f: string, t: string) {
    router.push(`${basePath}?from=${f}&to=${t}`);
  }

  function applyPreset(key: string) {
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset) return;
    go(preset.from(), preset.to());
  }

  const active = activePresetKey(from, to);
  const hasCustomChanges = customFrom !== from || customTo !== to;
  const invalidRange = customFrom > customTo;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
      {/* Preset dropdown */}
      <div className="relative w-full sm:w-auto">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BFD732] pointer-events-none">
          <CalendarIcon />
        </div>
        <select
          value={active}
          onChange={(e) => {
            if (e.target.value !== "custom") applyPreset(e.target.value);
          }}
          className="bg-[#16202E] text-white text-sm font-semibold pl-9 pr-9 py-2.5 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#BFD732] cursor-pointer appearance-none w-full sm:w-auto"
        >
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key} className="bg-white text-[#16202E]">
              {p.label}
            </option>
          ))}
          {active === "custom" && (
            <option value="custom" className="bg-white text-[#16202E]">
              Custom range
            </option>
          )}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BFD732] pointer-events-none">
          <ChevronIcon />
        </div>
      </div>

      <div className="hidden sm:block w-px h-6 bg-gray-200" />

      {/* Custom range */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <input
          type="date"
          value={customFrom}
          max={customTo}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#BFD732] focus:border-transparent min-w-0 flex-1 sm:flex-none"
        />
        <span className="text-gray-300 text-sm select-none">→</span>
        <input
          type="date"
          value={customTo}
          min={customFrom}
          onChange={(e) => setCustomTo(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#BFD732] focus:border-transparent min-w-0 flex-1 sm:flex-none"
        />
        <button
          onClick={() => go(customFrom, customTo)}
          disabled={invalidRange}
          className="bg-[#16202E] text-[#BFD732] text-sm font-semibold px-4 py-2.5 sm:py-2 rounded-xl hover:bg-[#232F42] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          Apply
        </button>
      </div>

      <div className="sm:ml-auto flex items-center gap-1.5 text-xs text-gray-400">
        <CalendarIcon />
        <span>{hasCustomChanges ? "Unsaved changes" : rangeLabel(from, to)}</span>
      </div>
    </div>
  );
}
