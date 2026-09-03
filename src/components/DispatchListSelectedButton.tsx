"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DispatchListSelectedButton({ selectedIds }: { selectedIds: number[] }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ecom/dispatch-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate dispatch list");
      router.push(`/ecommerce/dispatch/sheet?sheetId=${data.id}&print=1`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not generate dispatch list");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={generate}
      disabled={loading}
      className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-[#16202E] text-[#16202E] hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-[#16202E] rounded-full animate-spin" />
      ) : (
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
          <rect x="2.5" y="3.5" width="11" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      Dispatch List ({selectedIds.length})
    </button>
  );
}
