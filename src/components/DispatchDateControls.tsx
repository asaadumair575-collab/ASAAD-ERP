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
  const [open, setOpen] = useState(false);
  const [selFrom, setSelFrom] = useState(from);
  const [selTo, setSelTo] = useState(to);

  function applyPreset(days: number) {
    const [f, t] = presetRange(days);
    setSelFrom(f);
    setSelTo(t);
  }

  function generate() {
    router.push(`${basePath}?from=${selFrom}&to=${selTo}`);
    setOpen(false);
  }

  const invalidRange = selFrom > selTo;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelFrom(from);
          setSelTo(to);
          setOpen(true);
        }}
        className="bg-white border border-[#16202E] text-[#16202E] text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 print:hidden"
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Generate Dispatch Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[#16202E]">Generate Dispatch Report</h2>
              <p className="text-sm text-gray-500 mt-0.5">Select the date to generate the dispatch list for</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
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

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selFrom}
                onChange={(e) => setSelFrom(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#BFD732] focus:border-transparent"
              />
              <span className="text-gray-300 text-sm select-none">→</span>
              <input
                type="date"
                value={selTo}
                onChange={(e) => setSelTo(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#BFD732] focus:border-transparent"
              />
            </div>
            {invalidRange && <p className="text-xs text-red-500 -mt-3">From date must be before To date</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={invalidRange}
                onClick={generate}
                className="bg-[#16202E] text-[#BFD732] text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#232F42] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
