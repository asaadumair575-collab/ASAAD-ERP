"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateDispatchListButton() {
  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const [date, setDate] = useState(todayPK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ecom/dispatch-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate dispatch list");
      router.push(`/ecommerce/dispatch/sheet?sheetId=${data.id}&print=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate dispatch list");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#BFD732] focus:border-transparent"
        />
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="bg-white border border-[#16202E] text-[#16202E] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-[#16202E] rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          Dispatch List
        </button>
      </div>
      {error && <p className="text-xs text-red-500 max-w-xs text-right">{error}</p>}
    </div>
  );
}
