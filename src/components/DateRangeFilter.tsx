"use client";
import { useRef } from "react";

export default function DateRangeFilter({ from, to }: { from?: string | null; to?: string | null }) {
  const toRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-1.5 bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-black">
      <input
        type="date"
        name="from"
        defaultValue={from ?? ""}
        onChange={(e) => { if (e.target.value) toRef.current?.focus(); }}
        className="bg-transparent outline-none text-sm w-[130px]"
      />
      <span className="text-gray-300 select-none">→</span>
      <input
        ref={toRef}
        type="date"
        name="to"
        defaultValue={to ?? ""}
        onChange={(e) => { if (e.target.value) e.target.form?.requestSubmit(); }}
        className="bg-transparent outline-none text-sm w-[130px]"
      />
    </div>
  );
}
