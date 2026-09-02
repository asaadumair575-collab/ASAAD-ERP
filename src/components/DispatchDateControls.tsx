"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
];

function toLocal(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
}

function presetRange(days: number): [string, string] {
  const today = toLocal(new Date());
  if (days === 0) return [today, today];
  if (days === 1) {
    const y = toLocal(new Date(Date.now() - 86400000));
    return [y, y];
  }
  const start = toLocal(new Date(Date.now() - (days - 1) * 86400000));
  return [start, today];
}

export default function DispatchDateControls({ from, to, basePath }: { from: string; to: string; basePath: string }) {
  const router = useRouter();
  const [selFrom, setSelFrom] = useState(from);
  const [selTo, setSelTo] = useState(to);

  function applyPreset(days: number) {
    const [f, t] = presetRange(days);
    setSelFrom(f);
    setSelTo(t);
  }

  const invalidRange = selFrom > selTo;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-3 print:hidden">
      <div className="flex items-center gap-1.5">
        {PRESETS.map((p) => {
          const [f, t] = presetRange(p.days);
          const active = selFrom === f && selTo === t;
          return (
            <button
              key={p.days}
              type="button"
              onClick={() => applyPreset(p.days)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-[#16202E] text-[#BFD732]" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="hidden sm:block w-px h-6 bg-gray-200" />

      {/* Single day — picks one date and sets both ends of the range */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400 font-medium">Single day</span>
        <input
          type="date"
          value={selFrom === selTo ? selFrom : ""}
          onChange={(e) => {
            setSelFrom(e.target.value);
            setSelTo(e.target.value);
          }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#BFD732] focus:border-transparent"
        />
      </div>

      <div className="hidden sm:block w-px h-6 bg-gray-200" />

      {/* Range */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={selFrom}
          onChange={(e) => setSelFrom(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#BFD732] focus:border-transparent"
        />
        <span className="text-gray-300 text-sm select-none">→</span>
        <input
          type="date"
          value={selTo}
          onChange={(e) => setSelTo(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#BFD732] focus:border-transparent"
        />
      </div>

      <button
        type="button"
        disabled={invalidRange}
        onClick={() => router.push(`${basePath}?from=${selFrom}&to=${selTo}`)}
        className="ml-auto bg-white border border-[#16202E] text-[#16202E] text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Generate Dispatch Report
      </button>
    </div>
  );
}
