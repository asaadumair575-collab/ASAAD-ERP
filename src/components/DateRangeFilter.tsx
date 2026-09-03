"use client";
import { useRef, useState } from "react";

function getMonthOptions() {
  const now = new Date();
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    months.push({
      label: d.toLocaleString("en-PK", { month: "short", year: "2-digit" }),
      from,
      to,
    });
  }
  return months;
}

export default function DateRangeFilter({ from, to }: { from?: string | null; to?: string | null }) {
  const toRef = useRef<HTMLInputElement>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const [showMonths, setShowMonths] = useState(false);
  const months = getMonthOptions();

  function applyMonth(m: { from: string; to: string }) {
    if (fromRef.current) fromRef.current.value = m.from;
    if (toRef.current) toRef.current.value = m.to;
    setShowMonths(false);
    fromRef.current?.form?.requestSubmit();
  }

  const activeMonth = months.find((m) => m.from === from && m.to === to);

  return (
    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
      {/* Month quick-select */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowMonths((v) => !v)}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2.5 sm:py-2 rounded-lg border transition-colors ${
            activeMonth
              ? "bg-black text-white border-black"
              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
          }`}
        >
          {activeMonth ? activeMonth.label : "Month"}
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
        {showMonths && (
          <div className="absolute top-full mt-1.5 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[120px]">
            {months.map((m) => (
              <button
                key={m.from}
                type="button"
                onClick={() => applyMonth(m)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  m.from === from && m.to === to ? "font-semibold text-black" : "text-gray-700"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manual date range */}
      <div className="flex items-center gap-1.5 bg-gray-50 border border-transparent rounded-lg px-3 py-2.5 sm:py-2 text-sm focus-within:ring-2 focus-within:ring-black flex-1 sm:flex-none min-w-0">
        <input
          ref={fromRef}
          type="date"
          name="from"
          defaultValue={from ?? ""}
          onChange={(e) => { if (e.target.value) toRef.current?.focus(); }}
          className="bg-transparent outline-none text-base sm:text-sm w-[42%] sm:w-[130px]"
        />
        <span className="text-gray-300 select-none">→</span>
        <input
          ref={toRef}
          type="date"
          name="to"
          defaultValue={to ?? ""}
          onChange={(e) => { if (e.target.value) e.target.form?.requestSubmit(); }}
          className="bg-transparent outline-none text-base sm:text-sm w-[42%] sm:w-[130px]"
        />
      </div>
    </div>
  );
}
