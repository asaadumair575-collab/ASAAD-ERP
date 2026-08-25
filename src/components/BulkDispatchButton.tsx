"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BulkDispatchButton({ selectedIds }: { selectedIds: number[] }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ id: number; tracking?: string; error?: string }[] | null>(null);
  const router = useRouter();

  async function dispatch() {
    if (!selectedIds.length || loading) return;
    setLoading(true);
    setResults(null);
    const res = await fetch("/api/ecom/postex-dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });
    const data = await res.json();
    setLoading(false);
    setResults(data.results ?? []);
    router.refresh();
  }

  const success = results?.filter(r => r.tracking && !r.error).length ?? 0;
  const failed  = results?.filter(r => r.error).length ?? 0;

  return (
    <div className="flex items-center gap-3">
      {results && (
        <span className="text-xs text-gray-500">
          {success > 0 && <span className="text-green-600 font-medium">✓ {success} dispatched</span>}
          {failed > 0 && <span className="text-red-500 font-medium ml-2">✗ {failed} failed</span>}
        </span>
      )}
      <button
        onClick={dispatch}
        disabled={!selectedIds.length || loading}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
            <path d="M2 8h9M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
        {loading ? `Dispatching ${selectedIds.length}…` : `Dispatch via Postex${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
      </button>
    </div>
  );
}
