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

export default function DateNav({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function go(f: string, t: string) {
    router.push(`/ecommerce/shopify-dashboard?from=${f}&to=${t}`);
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

  function isActive(days: number) {
    if (days === 0) return from === todayStr && to === todayStr;
    if (days === 1) return from === yesterdayStr && to === yesterdayStr;
    const start = toLocal(new Date(Date.now() - (days - 1) * 86400000));
    return from === start && to === todayStr;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.days}
          onClick={() => applyPreset(p.days)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            isActive(p.days)
              ? "bg-[#16202E] text-[#BFD732] shadow-sm"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {p.label}
        </button>
      ))}

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
