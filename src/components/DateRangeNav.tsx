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

export default function DateRangeNav({ from, to, basePath }: { from: string; to: string; basePath: string }) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function go(f: string, t: string) {
    router.push(`${basePath}?from=${f}&to=${t}`);
  }

  function applyPreset(days: number) {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() - (days === 0 ? 0 : days === 1 ? 1 : 0));
    const start = days <= 1 ? new Date(end) : new Date(now);
    if (days > 1) start.setDate(start.getDate() - days + 1);
    go(toLocal(start), toLocal(end));
  }

  const todayStr = toLocal(new Date());
  const yesterdayStr = toLocal(new Date(Date.now() - 86400000));

  function activePresetDays(): number | "custom" {
    for (const p of PRESETS) {
      if (p.days === 0 && from === todayStr && to === todayStr) return 0;
      if (p.days === 1 && from === yesterdayStr && to === yesterdayStr) return 1;
      if (p.days > 1) {
        const start = toLocal(new Date(Date.now() - (p.days - 1) * 86400000));
        if (from === start && to === todayStr) return p.days;
      }
    }
    return "custom";
  }

  const active = activePresetDays();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={active}
        onChange={(e) => {
          if (e.target.value !== "custom") applyPreset(Number(e.target.value));
        }}
        className="bg-[#16202E] text-[#BFD732] text-sm font-semibold px-4 py-2.5 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#BFD732] cursor-pointer appearance-none bg-no-repeat bg-[right_0.75rem_center]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M5 7.5l5 5 5-5' stroke='%23BFD732' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
          paddingRight: "2.25rem",
        }}
      >
        {PRESETS.map((p) => (
          <option key={p.days} value={p.days} className="bg-white text-[#16202E]">
            {p.label}
          </option>
        ))}
        {active === "custom" && (
          <option value="custom" className="bg-white text-[#16202E]">
            Custom range
          </option>
        )}
      </select>

      <div className="flex items-center gap-2 ml-auto">
        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#BFD732]"
        />
        <span className="text-gray-400 text-sm">—</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#BFD732]"
        />
        <button
          onClick={() => go(customFrom, customTo)}
          className="bg-[#16202E] text-[#BFD732] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#232F42] transition-colors"
        >
          Go
        </button>
      </div>
    </div>
  );
}
