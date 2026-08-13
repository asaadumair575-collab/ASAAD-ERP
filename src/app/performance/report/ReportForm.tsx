"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReportForm({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const router = useRouter();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    router.push(`/performance/report?from=${from}&to=${to}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
      <div>
        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          required
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <button
        type="submit"
        className="bg-black text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-gray-800 transition-colors"
      >
        Generate Report
      </button>
    </form>
  );
}
